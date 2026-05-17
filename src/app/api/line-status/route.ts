import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const settings = await Settings.findOne({ merchantId: merchant.merchantId });
  const token = settings?.lineChannelAccessToken?.trim();

  if (!token) return NextResponse.json({ configured: false }, { status: 200 });

  const headers = { Authorization: `Bearer ${token}` };

  try {
    const [botRes, quotaRes, consumptionRes] = await Promise.all([
      fetch('https://api.line.me/v2/bot/info', { headers }),
      fetch('https://api.line.me/v2/bot/message/quota', { headers }),
      fetch('https://api.line.me/v2/bot/message/quota/consumption', { headers }),
    ]);

    if (!botRes.ok) {
      return NextResponse.json({ configured: true, valid: false, error: 'Invalid LINE access token' }, { status: 200 });
    }

    const [bot, quota, consumption] = await Promise.all([
      botRes.json(),
      quotaRes.ok ? quotaRes.json() : { type: 'limited', value: 300 },
      consumptionRes.ok ? consumptionRes.json() : { totalUsage: 0 },
    ]);

    // Probe follower IDs endpoint to detect verification status
    let isVerified = false;
    try {
      const probe = await fetch('https://api.line.me/v2/bot/followers/ids?limit=1', { headers });
      isVerified = probe.ok;
    } catch { /* unverified */ }

    const isUnlimited = quota.type === 'none';
    const tier: 'unverified' | 'verified' | 'premium' = isUnlimited ? 'premium' : isVerified ? 'verified' : 'unverified';

    return NextResponse.json({
      configured: true,
      valid: true,
      bot: {
        displayName: bot.displayName,
        basicId: bot.basicId,
        pictureUrl: bot.pictureUrl ?? null,
        chatMode: bot.chatMode,
      },
      tier,
      quota: {
        type: quota.type,
        value: quota.value ?? null,
      },
      consumption: {
        totalUsage: consumption.totalUsage ?? 0,
      },
      capabilities: {
        followerSync: isVerified,
        narrowcastAdvanced: isVerified,
        unlimitedMessages: isUnlimited,
      },
    });
  } catch (err) {
    console.error('[line-status]', err);
    return NextResponse.json({ configured: true, valid: false, error: 'Failed to reach LINE API' }, { status: 200 });
  }
}
