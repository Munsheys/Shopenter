import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, AffiliateCommission } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

const VALID_TIERS = ['pro', 'enterprise'];

export async function POST(req: NextRequest) {
  const session = getMerchantFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { tier } = await req.json();
    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    await dbConnect();

    const merchant = await Merchant.findById(session.merchantId);
    if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // No payment processor is wired up yet, so checkout confirms the upgrade immediately.
    // This is the real "conversion" signal everything else (incl. affiliate rewards) hooks into.
    merchant.tier = tier;
    merchant.paymentStatus = 'paid';
    merchant.trialEndsAt = null;
    await merchant.save();

    if (merchant.referredByMerchantId) {
      await AffiliateCommission.findOneAndUpdate(
        { referredMerchantId: merchant._id, status: 'pending' },
        { $set: { status: 'converted', convertedAt: new Date() } }
      );
    }

    return NextResponse.json({ paymentUrl: null, tier: merchant.tier });
  } catch (err) {
    console.error('[billing/checkout]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
