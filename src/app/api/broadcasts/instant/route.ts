import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings, Customer, Order, Campaign } from '@/models';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { sendTelegramMessage, sendTelegramPhotoWithKeyboard } from '@/lib/platforms/telegram';
import { createInstagramPost, createInstagramStory } from '@/lib/platforms/instagram';

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
  const customers = await Customer.find({ merchantId, status: { $ne: 'blocked' } }).select('userId').lean() as any[];
  return customers.map((c: any) => c.userId);
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  // Build LINE messages array from unified content
  const lineMessages: any[] = [];
  if (imageUrl) lineMessages.push({ type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl });
  if (caption.trim()) lineMessages.push({ type: 'text', text: caption });
  lineMessages.push(...lineExtraBlocks);

  // Instagram doesn't use customer list — it's a single post
  const nonIgPlatforms = requestedPlatforms.filter(p => p !== 'instagram');
  const userIds = nonIgPlatforms.length > 0 ? await resolveAudience(merchant.merchantId, audience) : [];

  const campaign = await Campaign.create({
    merchantId: merchant.merchantId,
    name,
    deliveryMode: 'instant',
    messages: lineMessages,
    status: 'sending',
    audience,
    recipientCount: 0,
    totalTargeted: userIds.length,
    sentAt: new Date(),
    platforms: requestedPlatforms,
  });

  const results: Record<string, { sent: number; failed: number; postId?: string; postType?: string; error?: string }> = {};
  let totalSent = 0;
  let totalFailed = 0;
  const CHUNK = 500;

  for (const platform of requestedPlatforms) {
    let sent = 0;
    let failed = 0;

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
            body: JSON.stringify({ to: chunk, messages: lineMessages }),
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
          const success = imageUrl
            ? await sendTelegramPhotoWithKeyboard(token, userId, imageUrl, caption, [])
            : await sendTelegramMessage(token, userId, caption);
          if (success) sent++;
          else failed++;
        } catch { failed++; }
      }

    } else if (platform === 'instagram') {
      const token = settings?.instagram?.pageAccessToken?.trim();
      const igAccountId = settings?.instagram?.igAccountId?.trim();

      if (!imageUrl) {
        results['instagram'] = { sent: 0, failed: 1, error: 'Image required for Instagram post' };
        totalFailed++;
        continue;
      }

      try {
        const result = igPostType === 'story'
          ? await createInstagramStory(token, igAccountId, imageUrl)
          : await createInstagramPost(token, igAccountId, imageUrl, caption);

        if (result.success) {
          sent = 1;
          results['instagram'] = { sent: 1, failed: 0, postId: result.postId, postType: igPostType };
        } else {
          results['instagram'] = { sent: 0, failed: 1 };
        }
      } catch {
        results['instagram'] = { sent: 0, failed: 1 };
      }
      totalSent += sent;
      continue;
    }

    results[platform] = { sent, failed };
    totalSent += sent;
    totalFailed += failed;
  }

  await Campaign.findByIdAndUpdate(campaign._id, {
    status: totalSent === 0 ? 'failed' : 'completed',
    recipientCount: totalSent,
  });

  return NextResponse.json({ results, total: userIds.length, platforms: requestedPlatforms });
}
