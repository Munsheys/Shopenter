import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings, Customer, Order, Campaign, BroadcastJob } from '@/models';
import mongoose from 'mongoose';
import { createInstagramPost, createInstagramStory } from '@/lib/platforms/instagram';

export const runtime = 'nodejs';

// The broadcast-worker cron (vercel.json) is scheduled every 5 minutes, but Vercel's
// Hobby plan only runs crons once/day — on Hobby, a "broadcast" would actually take up
// to 24 hours to deliver, which isn't broadcast at all. Manual toggle: there's no
// programmatic way to detect which Vercel plan a deployment is on, so this is an
// explicit env var you flip once you've upgraded, rather than automatic detection.
const BROADCAST_ENABLED = process.env.BROADCAST_ENABLED === 'true';

const LINE_CHUNK = 500;     // LINE multicast API's own per-call recipient cap
const TELEGRAM_CHUNK = 30;  // Telegram has no batch endpoint — kept small so one job stays fast

async function resolveAudience(merchantId: string, audience: string): Promise<string[]> {
  if (audience === 'active_30d' || audience === 'active_60d') {
    const days = audience === 'active_30d' ? 30 : 60;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const customers = await Customer.find({ merchantId, lastSeen: { $gte: since }, status: { $ne: 'blocked' } }).select('userId').lean() as any[];
    return customers.map((c: any) => c.userId).filter(Boolean);
  }
  if (audience === 'ordered') {
    const ids = await Order.find({ merchantId }).distinct('userId');
    return (ids as string[]).filter(Boolean);
  }
  if (audience === 'never_ordered') {
    const orderedIds = new Set((await Order.find({ merchantId }).distinct('userId') as string[]).filter(Boolean));
    const customers = await Customer.find({ merchantId, status: { $ne: 'blocked' } }).select('userId').lean() as any[];
    return customers.map((c: any) => c.userId).filter((uid: string) => uid && !orderedIds.has(uid));
  }
  if (audience === 'high_value') {
    const result = await Order.aggregate([
      { $match: { merchantId: new mongoose.Types.ObjectId(merchantId) } },
      { $group: { _id: '$userId', total: { $sum: '$soldTHB' } } },
      { $match: { total: { $gte: 5000 }, _id: { $ne: null } } },
    ]);
    return result.map((r: any) => r._id).filter(Boolean);
  }
  const customers = await Customer.find({ merchantId, status: { $ne: 'blocked' } }).select('userId').lean() as any[];
  return customers.map((c: any) => c.userId);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Creates the Campaign + queues per-recipient fan-out as BroadcastJob batches, then
 * returns immediately — actual sending happens in the broadcast-worker cron. This is
 * what makes "instant" broadcasts to a large audience not time out the request (see
 * the Phase 4h note in the launch-readiness plan): LINE/Telegram sends used to run
 * fully synchronously in this route with no maxDuration override.
 *
 * Instagram isn't a per-recipient fan-out (a single post/story), so it still runs
 * synchronously here — that's already fast.
 */
export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!BROADCAST_ENABLED) {
    return NextResponse.json(
      { error: 'Broadcasting is temporarily unavailable while we finish upgrading delivery infrastructure. Please check back soon.' },
      { status: 503 }
    );
  }

  const body = await req.json();
  const {
    caption = '',
    imageUrl,
    igPostType = 'feed',
    lineExtraBlocks = [],
    audience = 'all',
    name = '',
    platforms = ['line'],
  } = body;

  if (!caption.trim() && !imageUrl) {
    return NextResponse.json({ error: 'Provide a caption or image' }, { status: 400 });
  }
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return NextResponse.json({ error: 'At least one platform must be selected' }, { status: 400 });
  }

  await dbConnect();
  const settings = await Settings.findOne({ merchantId: merchant.merchantId });

  const configuredPlatforms: string[] = [];
  if (settings?.lineChannelAccessToken?.trim()) configuredPlatforms.push('line');
  if (settings?.telegram?.botToken?.trim() && settings?.telegram?.webhookActive) configuredPlatforms.push('telegram');
  if (settings?.instagram?.pageAccessToken?.trim() && settings?.instagram?.igAccountId?.trim()) configuredPlatforms.push('instagram');

  const requestedPlatforms = (platforms as string[]).filter(p => configuredPlatforms.includes(p));
  if (requestedPlatforms.length === 0) {
    return NextResponse.json({ error: 'No selected platforms are configured' }, { status: 400 });
  }

  const lineMessages: any[] = [];
  if (imageUrl) lineMessages.push({ type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl });
  if (caption.trim()) lineMessages.push({ type: 'text', text: caption });
  lineMessages.push(...lineExtraBlocks);

  const nonIgPlatforms = requestedPlatforms.filter(p => p !== 'instagram');
  const userIds = nonIgPlatforms.length > 0 ? await resolveAudience(merchant.merchantId, audience) : [];

  const campaign = await Campaign.create({
    merchantId: merchant.merchantId,
    name,
    deliveryMode: 'instant',
    messages: lineMessages,
    status: nonIgPlatforms.length > 0 ? 'sending' : 'completed',
    audience,
    recipientCount: 0,
    totalTargeted: userIds.length,
    sentAt: new Date(),
  });

  const results: Record<string, { sent?: number; failed?: number; queued?: boolean; postId?: string; postType?: string; error?: string }> = {};

  if (requestedPlatforms.includes('line') && userIds.length > 0) {
    const batches = chunk(userIds, LINE_CHUNK);
    await BroadcastJob.insertMany(batches.map(recipients => ({
      merchantId: merchant.merchantId,
      campaignId: campaign._id,
      platform: 'line',
      recipients,
      messages: lineMessages,
    })));
    results.line = { queued: true };
  }

  if (requestedPlatforms.includes('telegram') && userIds.length > 0) {
    const batches = chunk(userIds, TELEGRAM_CHUNK);
    await BroadcastJob.insertMany(batches.map(recipients => ({
      merchantId: merchant.merchantId,
      campaignId: campaign._id,
      platform: 'telegram',
      recipients,
      imageUrl: imageUrl || '',
      caption,
    })));
    results.telegram = { queued: true };
  }

  if (requestedPlatforms.includes('instagram')) {
    const token = settings?.instagram?.pageAccessToken?.trim();
    const igAccountId = settings?.instagram?.igAccountId?.trim();

    if (!imageUrl) {
      results.instagram = { sent: 0, failed: 1, error: 'Image required for Instagram post' };
    } else {
      try {
        const result = igPostType === 'story'
          ? await createInstagramStory(token, igAccountId, imageUrl)
          : await createInstagramPost(token, igAccountId, imageUrl, caption);

        results.instagram = result.success
          ? { sent: 1, failed: 0, postId: result.postId, postType: igPostType }
          : { sent: 0, failed: 1 };
      } catch {
        results.instagram = { sent: 0, failed: 1 };
      }
    }
  }

  return NextResponse.json({
    campaignId: campaign._id,
    results,
    total: userIds.length,
    platforms: requestedPlatforms,
    message: nonIgPlatforms.length > 0
      ? 'Broadcast queued — delivery happens in the background, check back for the final count.'
      : 'Broadcast sent.',
  });
}
