import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const s = await Settings.findOne({ merchantId: merchant.merchantId });

  return NextResponse.json({
    line: !!(s?.lineChannelAccessToken?.trim()),
    telegram: !!(s?.telegram?.botToken?.trim() && s?.telegram?.webhookActive),
    instagram: !!(s?.instagram?.pageAccessToken?.trim() && s?.instagram?.igAccountId?.trim()),
  });
}
