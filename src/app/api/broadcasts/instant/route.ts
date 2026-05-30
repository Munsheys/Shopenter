import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings, Customer, Order, Campaign } from '@/models';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { sendTelegramMessage } from '@/lib/platforms/telegram';
import { sendInstagramMessage } from '@/lib/platforms/instagram';

export const runtime = 'nodejs';

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
  // 'all' — every non-blocked customer
  const customers = await Customer.find({ merchantId, status: { $ne: 'blocked' } }).select('userId').lean() as any[];
  return customers.map((c: any) => c.userId);
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages, audience = 'all', name = '', platforms = ['line'] } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
  }
  if (messages.length > 5) {
    return NextResponse.json({ error: 'Maximum 5 message blocks per broadcast' }, { status: 400 });
  }
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return NextResponse.json({ error: 'At least one platform must be selected' }, { status: 400 });
  }

  await dbConnect();
  const settings = await Settings.findOne({ merchantId: merchant.merchantId });

  // Validate that requested platforms are configured
  const configuredPlatforms: string[] = [];
  if (settings?.lineChannelAccessToken?.trim()) configuredPlatforms.push('line');
  if (settings?.telegram?.botToken?.trim() && settings?.telegram?.webhookActive) configuredPlatforms.push('telegram');
  if (settings?.instagram?.pageAccessToken?.trim() && settings?.instagram?.igAccountId) configuredPlatforms.push('instagram');

  const requestedPlatforms = platforms.filter((p: string) => configuredPlatforms.includes(p));
  if (requestedPlatforms.length === 0) {
    return NextResponse.json({ error: 'No selected platforms are configured' }, { status: 400 });
  }

  const userIds = await resolveAudience(merchant.merchantId, audience);
  if (userIds.length === 0) return NextResponse.json({ error: 'No recipients in selected audience' }, { status: 400 });

  // Create the record before sending
  const campaign = await Campaign.create({
    merchantId: merchant.merchantId,
    name,
    deliveryMode: 'instant',
    messages,
    status: 'sending',
    audience,
    recipientCount: 0,
    totalTargeted: userIds.length,
    sentAt: new Date(),
    platforms: requestedPlatforms, // Store which platforms were targeted
  });

  const results: Record<string, { sent: number; failed: number }> = {};
  let totalSent = 0;
  let totalFailed = 0;
  const CHUNK = 500;

  // Send to each platform
  for (const platform of requestedPlatforms) {
    let sent = 0;
    let failed = 0;
    const text = messages[0]?.text || 'New broadcast message'; // Fallback text

    if (platform === 'line') {
      const token = settings?.lineChannelAccessToken?.trim();
      for (let i = 0; i < userIds.length; i += CHUNK) {
        const chunk = userIds.slice(i, i + CHUNK);
        const retryKey = randomUUID();
        try {
          const res = await fetch('https://api.line.me/v2/bot/message/multicast', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'X-Line-Retry-Key': retryKey,
            },
            body: JSON.stringify({ to: chunk, messages }),
          });
          if (res.ok) {
            sent += chunk.length;
          } else {
            failed += chunk.length;
            console.error('[line multicast]', await res.text());
          }
        } catch (err) {
          failed += chunk.length;
          console.error('[line error]', err);
        }
        if (i + CHUNK < userIds.length) await new Promise(r => setTimeout(r, 100));
      }
    } else if (platform === 'telegram') {
      const token = settings?.telegram?.botToken?.trim();
      for (const userId of userIds) {
        try {
          const success = await sendTelegramMessage(token, userId, text);
          if (success) sent++;
          else failed++;
        } catch {
          failed++;
        }
      }
    } else if (platform === 'instagram') {
      const token = settings?.instagram?.pageAccessToken?.trim();
      for (const userId of userIds) {
        try {
          const success = await sendInstagramMessage(token, userId, text);
          if (success) sent++;
          else failed++;
        } catch {
          failed++;
        }
      }
    }

    results[platform] = { sent, failed };
    totalSent += sent;
    totalFailed += failed;
  }

  await Campaign.findByIdAndUpdate(campaign._id, {
    status: totalFailed === userIds.length * requestedPlatforms.length ? 'failed' : 'completed',
    recipientCount: totalSent,
  });

  return NextResponse.json({ results, total: userIds.length, platforms: requestedPlatforms });
}
