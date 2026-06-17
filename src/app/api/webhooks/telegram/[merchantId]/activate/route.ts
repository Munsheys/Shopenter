export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';
import { setTelegramWebhook } from '@/lib/platforms/telegram';
import { getMerchantFromRequest } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { merchantId } = await params;
  if (merchant.merchantId !== merchantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await dbConnect();
  const settings = await Settings.findOne({ merchantId }).lean() as any;
  if (!settings?.telegram?.botToken) return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 });

  // Derive the app base URL from the request headers
  const host = req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const webhookUrl = `${proto}://${host}/api/webhooks/telegram/${merchantId}`;

  // Reuse an existing secret if present, otherwise mint one. Telegram echoes it back
  // in the X-Telegram-Bot-Api-Secret-Token header so the webhook can reject forgeries.
  const webhookSecret: string = settings.telegram.webhookSecret || randomUUID().replace(/-/g, '');

  const result = await setTelegramWebhook(settings.telegram.botToken, webhookUrl, webhookSecret);

  if (result.ok) {
    await Settings.findOneAndUpdate(
      { merchantId },
      { 'telegram.webhookActive': true, 'telegram.webhookSecret': webhookSecret },
    );
    return NextResponse.json({ success: true, webhookUrl });
  } else {
    return NextResponse.json({ error: result.description ?? 'Failed to set webhook' }, { status: 400 });
  }
}
