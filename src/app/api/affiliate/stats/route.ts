import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, AffiliateCommission } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();

    const m = await Merchant.findById(merchant.merchantId).select(
      'referralCode affiliateRewardsEarnedThisYear'
    );

    if (!m?.referralCode) {
      return NextResponse.json(
        { error: 'No referral code generated yet' },
        { status: 404 }
      );
    }

    // Find all commissions for this referrer
    const commissions = await AffiliateCommission.find({
      referrerMerchantId: merchant.merchantId,
    })
      .select('-__v')
      .lean();

    const pending = commissions.filter(c => c.status === 'pending');
    const earned = commissions.filter(c => c.status === 'earned');
    const expired = commissions.filter(c => c.status === 'expired');

    return NextResponse.json({
      referralCode: m.referralCode,
      referralUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app'}/join?ref=${m.referralCode}`,
      stats: {
        totalReferrals: commissions.length,
        pendingConversions: pending.length,
        earnedRewards: earned.length,
        expiredReferrals: expired.length,
        rewardsEarnedThisYear: m.affiliateRewardsEarnedThisYear || 0,
        rewardCapRemaining: 12 - (m.affiliateRewardsEarnedThisYear || 0),
      },
      commissions: commissions.map(c => ({
        id: c._id,
        referredMerchantId: c.referredMerchantId,
        referralCode: c.referralCode,
        status: c.status,
        createdAt: c.createdAt,
        expiresAt: c.expiresAt,
        earnedAt: c.earnedAt,
        rewardAppliedAt: c.rewardAppliedAt,
        daysUntilExpiry: c.status === 'pending'
          ? Math.ceil((c.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          : null,
      })),
    });
  } catch (err: any) {
    console.error('[affiliate/stats]', err);
    return NextResponse.json({ error: 'Failed to fetch affiliate stats' }, { status: 500 });
  }
}
