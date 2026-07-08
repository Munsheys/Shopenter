import { NextRequest, NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';
import dbConnect from '@/lib/db';
import { Settings, Merchant } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { buildGreetingMessages, buildReEngageMessages, buildStorefrontUrl } from '@/lib/engagementMessages';

export const runtime = 'nodejs';

/**
 * POST /api/greeting/test
 * Sends a live test of the greeting or re-engagement message to the merchant's
 * own Admin LINE ID, using the exact same message-building logic as the webhook.
 */
export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { kind } = body;
  if (kind !== 'greeting' && kind !== 'reengage') {
    return NextResponse.json({ error: 'kind must be "greeting" or "reengage"' }, { status: 400 });
  }

  try {
    await dbConnect();

    const settings = await Settings.findOne({ merchantId: merchant.merchantId }).lean() as any;
    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    if (!settings.adminLineId?.trim()) {
      return NextResponse.json({ error: 'Set your Admin LINE ID in Settings first' }, { status: 400 });
    }

    const channelAccessToken = (settings.lineChannelAccessToken || '').trim();
    if (!channelAccessToken) {
      return NextResponse.json({ error: 'LINE channel access token is not configured' }, { status: 400 });
    }

    const merchantDoc = await Merchant.findById(merchant.merchantId).select('slug').lean() as any;
    const storefrontUrl = buildStorefrontUrl(merchantDoc?.slug, merchant.merchantId);

    const messages = kind === 'greeting'
      ? buildGreetingMessages(settings, storefrontUrl)
      : buildReEngageMessages(settings, storefrontUrl);

    const client = new messagingApi.MessagingApiClient({ channelAccessToken });
    await client.pushMessage({ to: settings.adminLineId.trim(), messages });

    return NextResponse.json({ success: true, message: 'Test message sent to your Admin LINE ID', preview: messages });
  } catch (error) {
    console.error('[greeting test] Error:', error);
    return NextResponse.json({ error: 'Failed to send test message. Check your LINE credentials.' }, { status: 500 });
  }
}
