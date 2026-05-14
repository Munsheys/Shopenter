import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Message, Settings } from '@/models';
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
    await dbConnect();
    const settings = await Settings.findOne({ merchantId: merchant.merchantId });

    const newMessage = await Message.create({
      merchantId: merchant.merchantId,
      lineUserId: userId,
      text,
      sender: 'admin',
      createdAt: new Date()
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
