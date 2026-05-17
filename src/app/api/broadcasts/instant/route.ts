import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings, Customer, Order, Campaign } from '@/models';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

async function resolveAudience(merchantId: string, audience: string): Promise<string[]> {
  if (audience === 'active_30d' || audience === 'active_60d') {
    const days = audience === 'active_30d' ? 30 : 60;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const ids = await Order.find({ merchantId, createdAt: { $gte: since } }).distinct('lineUserId');
    return (ids as string[]).filter(Boolean);
  }
  if (audience === 'ordered') {
    const ids = await Order.find({ merchantId }).distinct('lineUserId');
    return (ids as string[]).filter(Boolean);
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

  const retryKey = randomUUID();
  const CHUNK = 500;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
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
    // Throttle between chunks
    if (i + CHUNK < userIds.length) await new Promise(r => setTimeout(r, 200));
  }

  await Campaign.create({
    merchantId: merchant.merchantId,
    name,
    deliveryMode: 'instant',
    messages,
    status: 'completed',
    audience,
    recipientCount: sent,
    sentAt: new Date(),
    retryKey,
    totalTargeted: userIds.length,
  });

  return NextResponse.json({ sent, failed, total: userIds.length });
}
