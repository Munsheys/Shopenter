import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    let s = await Settings.findOne({ merchantId: merchant.merchantId });
    if (!s) {
      s = await Settings.create({ merchantId: merchant.merchantId });
    }
    const settings = s.toObject();
    // Strip LINE secrets from response — clients get them only through the LINE SDK
    delete settings.lineChannelAccessToken;
    delete settings.lineChannelSecret;
    delete settings.adminSecret;
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const body = await req.json();

    // Sanitize LINE credential strings
    if (typeof body.lineChannelSecret === 'string') body.lineChannelSecret = body.lineChannelSecret.trim();
    if (typeof body.lineChannelAccessToken === 'string') body.lineChannelAccessToken = body.lineChannelAccessToken.trim();
    if (typeof body.liffId === 'string') body.liffId = body.liffId.trim();

    // Never let clients overwrite the merchantId binding
    delete body.merchantId;

    const s = await Settings.findOneAndUpdate(
      { merchantId: merchant.merchantId },
      { $set: body },
      { upsert: true, new: true }
    );
    return NextResponse.json(s);
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
