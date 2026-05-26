import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings, Customer, Order, Campaign } from '@/models';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';

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

  const { messages, audience = 'all', name = '' } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
  }
  if (messages.length > 5) {
    return NextResponse.json({ error: 'Maximum 5 message blocks per broadcast' }, { status: 400 });
  }

  await dbConnect();
  const settings = await Settings.findOne({ merchantId: merchant.merchantId });
  const token = settings?.lineChannelAccessToken?.trim();
  if (!token) return NextResponse.json({ error: 'LINE token not configured' }, { status: 400 });

  const userIds = await resolveAudience(merchant.merchantId, audience);
  if (userIds.length === 0) return NextResponse.json({ error: 'No recipients in selected audience' }, { status: 400 });

  // Create the record before sending so a mid-send crash still leaves an auditable trail.
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
  });

  const CHUNK = 500;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    // Each chunk is a separate LINE API request — it needs its own retry key so LINE
    // can deduplicate retries of that specific chunk without affecting the others.
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
        console.error('[multicast chunk]', await res.text());
      }
    } catch (err) {
      failed += chunk.length;
      console.error('[multicast error]', err);
    }
    if (i + CHUNK < userIds.length) await new Promise(r => setTimeout(r, 200));
  }

  await Campaign.findByIdAndUpdate(campaign._id, {
    status: failed === userIds.length ? 'failed' : 'completed',
    recipientCount: sent,
  });

  return NextResponse.json({ sent, failed, total: userIds.length });
}
