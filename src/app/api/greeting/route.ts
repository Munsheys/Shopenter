import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const settings = await Settings.findOne({ merchantId: merchant.merchantId }).select('greetingEnabled greetingMessages').lean() as any;

  return NextResponse.json({
    greetingEnabled: settings?.greetingEnabled ?? false,
    greetingMessages: settings?.greetingMessages ?? [],
  });
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { greetingEnabled, greetingMessages } = await req.json();

  if (typeof greetingEnabled !== 'boolean') {
    return NextResponse.json({ error: 'greetingEnabled must be a boolean' }, { status: 400 });
  }
  if (!Array.isArray(greetingMessages) || greetingMessages.length > 5) {
    return NextResponse.json({ error: 'greetingMessages must be an array of up to 5 blocks' }, { status: 400 });
  }

  await dbConnect();
  await Settings.findOneAndUpdate(
    { merchantId: merchant.merchantId },
    { $set: { greetingEnabled, greetingMessages } },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}
