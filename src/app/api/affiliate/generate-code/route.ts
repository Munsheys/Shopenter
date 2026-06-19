import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, Settings } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { checkBooleanFeature } from '@/lib/tiers';

export const runtime = 'nodejs';

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 14).toLowerCase();
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();

    // Tier gate: Pro+ only
    const settings = await Settings.findOne({ merchantId: merchant.merchantId });
    const tier = (settings as any)?.tier || 'free'; // fallback if settings not loaded with tier
    const m = await Merchant.findById(merchant.merchantId);
    const tierToCheck = m?.tier || tier || 'free';

    if (!checkBooleanFeature(tierToCheck as any, 'affiliateProgram')) {
      return NextResponse.json(
        { error: 'Feature not available on your plan. Upgrade to Pro.' },
        { status: 403 }
      );
    }

    // If merchant already has a code, return it
    const existing = await Merchant.findById(merchant.merchantId).select('referralCode');
    if (existing?.referralCode) {
      return NextResponse.json({
        referralCode: existing.referralCode,
        referralUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app'}/join?ref=${existing.referralCode}`,
      });
    }

    // Generate unique code
    let code;
    let attempts = 0;
    const maxAttempts = 10;
    let codeExists = true;

    while (codeExists && attempts < maxAttempts) {
      code = generateReferralCode();
      codeExists = !!(await Merchant.findOne({ referralCode: code }));
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique referral code. Please try again.' },
        { status: 500 }
      );
    }

    // Save code to merchant
    await Merchant.findByIdAndUpdate(merchant.merchantId, { referralCode: code });

    return NextResponse.json({
      referralCode: code,
      referralUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app'}/join?ref=${code}`,
    });
  } catch (err: any) {
    console.error('[generate-code]', err);
    return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 });
  }
}
