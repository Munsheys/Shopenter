import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Settings, Merchant } from '@/models';
import { checkBooleanFeature, type Tier } from '@/lib/tiers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const settings = await Settings.findOne({ merchantId: merchant.merchantId }).select('loyalty').lean() as any;
  return NextResponse.json(settings?.loyalty ?? { enabled: false, pointsPerBaht: 1, redeemRate: 100, minRedeemPoints: 100 });
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();

  const merchantDoc = await Merchant.findById(merchant.merchantId).select('tier').lean() as any;
  const tier = (merchantDoc?.tier ?? 'free') as Tier;
  const body = await req.json();

  if (body.enabled && !checkBooleanFeature(tier, 'loyalty')) {
    return NextResponse.json(
      { error: 'TIER_LIMIT_REACHED', feature: 'loyalty', requiredTier: 'pro' },
      { status: 403 }
    );
  }

  const settings = await Settings.findOneAndUpdate(
    { merchantId: merchant.merchantId },
    { $set: { loyalty: body } },
    { new: true, upsert: true }
  );
  return NextResponse.json(settings.loyalty);
}
