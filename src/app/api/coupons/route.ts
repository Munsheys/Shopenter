import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Coupon, Merchant } from '@/models';
import { checkBooleanFeature, type Tier } from '@/lib/tiers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const coupons = await Coupon.find({ merchantId: merchant.merchantId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(coupons);
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();

  const merchantDoc = await Merchant.findById(merchant.merchantId).select('tier').lean() as any;
  const tier = (merchantDoc?.tier ?? 'free') as Tier;
  if (!checkBooleanFeature(tier, 'discountCodes')) {
    return NextResponse.json(
      { error: 'TIER_LIMIT_REACHED', feature: 'discountCodes', requiredTier: 'pro' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { code, type, value, minOrderAmount = 0, maxUses = 0, expiresAt = null } = body;

  if (!code || !type || !value) {
    return NextResponse.json({ error: 'code, type, and value are required' }, { status: 400 });
  }
  if (!['percent', 'fixed'].includes(type)) {
    return NextResponse.json({ error: 'type must be percent or fixed' }, { status: 400 });
  }
  if (type === 'percent' && (value <= 0 || value > 100)) {
    return NextResponse.json({ error: 'Percent value must be 1–100' }, { status: 400 });
  }

  const coupon = await Coupon.create({
    merchantId: merchant.merchantId,
    code: String(code).toUpperCase().trim(),
    type,
    value: Number(value),
    minOrderAmount: Number(minOrderAmount),
    maxUses: Number(maxUses),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    isActive: true,
  });

  return NextResponse.json(coupon, { status: 201 });
}
