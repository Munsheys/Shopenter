import { NextRequest, NextResponse } from 'next/server';
import { MessageRepo } from '@/lib/repos/message';
import { SettingsRepo } from '@/lib/repos/settings';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId, text } = await req.json();
  if (!userId || !text) {
    return NextResponse.json({ error: 'Missing userId or text' }, { status: 400 });
  }

  try {
    const settings = await SettingsRepo.findByMerchantId(merchant.merchantId);

    const newMessage = await MessageRepo.create({
      merchantId: merchant.merchantId,
      userId,
      platform: 'line',
      text,
      sender: 'admin',
    });

    const token = settings?.lineChannelAccessToken;
    if (token) {
      try {
        const res = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] })
        });
        if (!res.ok) console.error('[LINE push]', await res.json());
      } catch (e) {
        console.error('[LINE push] network error', e);
      }
    }

    return NextResponse.json(newMessage, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
