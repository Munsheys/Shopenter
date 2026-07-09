import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { BroadcastJob, Campaign, Settings } from '@/models';
import { randomUUID } from 'crypto';
import { sendTelegramMessage, sendTelegramPhotoWithKeyboard } from '@/lib/platforms/telegram';

export const runtime = 'nodejs';
export const maxDuration = 60;

const JOBS_PER_RUN = 20; // bounds one invocation's duration; remaining jobs pick up next run

/**
 * Drains BroadcastJob batches queued by POST /api/broadcasts/instant. Runs frequently
 * (see vercel.json) so "instant" broadcasts still feel instant for reasonably-sized
 * audiences — a single cron run processes up to JOBS_PER_RUN batches before returning,
 * so a very large broadcast spreads across a few runs instead of one long request.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    const jobs = await BroadcastJob.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(JOBS_PER_RUN);
    let processed = 0;

    for (const job of jobs) {
      const settings = await Settings.findOne({ merchantId: job.merchantId });
      let sent = 0;
      let failed = 0;

      if (job.platform === 'line') {
        const token = settings?.lineChannelAccessToken?.trim();
        if (token) {
          try {
            const res = await fetch('https://api.line.me/v2/bot/message/multicast', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'X-Line-Retry-Key': randomUUID(),
              },
              body: JSON.stringify({ to: job.recipients, messages: job.messages }),
            });
            if (res.ok) sent = job.recipients.length;
            else failed = job.recipients.length;
          } catch {
            failed = job.recipients.length;
          }
        } else {
          failed = job.recipients.length;
        }
      } else if (job.platform === 'telegram') {
        const token = settings?.telegram?.botToken?.trim();
        for (const userId of job.recipients) {
          try {
            const success = token && (job.imageUrl
              ? await sendTelegramPhotoWithKeyboard(token, userId, job.imageUrl, job.caption, [])
              : await sendTelegramMessage(token, userId, job.caption));
            if (success) sent++;
            else failed++;
          } catch {
            failed++;
          }
        }
      }

      job.status = failed > 0 && sent === 0 ? 'failed' : 'done';
      job.sentCount = sent;
      job.failedCount = failed;
      await job.save();
      processed++;

      const remaining = await BroadcastJob.countDocuments({ campaignId: job.campaignId, status: 'pending' });
      const agg = await BroadcastJob.aggregate([
        { $match: { campaignId: job.campaignId, status: { $in: ['done', 'failed'] } } },
        { $group: { _id: null, sent: { $sum: '$sentCount' } } },
      ]);
      const totalSent = agg[0]?.sent ?? 0;

      await Campaign.findByIdAndUpdate(job.campaignId, {
        recipientCount: totalSent,
        ...(remaining === 0 ? { status: totalSent > 0 ? 'completed' : 'failed' } : {}),
      });
    }

    return NextResponse.json({ message: 'Broadcast worker cron completed', processed, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[broadcast-worker cron]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
