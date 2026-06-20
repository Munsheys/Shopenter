import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, AffiliateCommission } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { MAX_REWARDS_PER_ROLLING_YEAR } from '@/lib/affiliate';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();

    const m = await Merchant.findById(merchant.merchantId).select('referralCode');

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
    const converted = commissions.filter(c => c.status === 'converted');
    const earned = commissions.filter(c => c.status === 'earned');
    const expiredOrReversed = commissions.filter(c => c.status === 'expired' || c.status === 'reversed');

    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const rewardsEarnedThisYear = earned.filter(
      c => c.rewardAppliedAt && new Date(c.rewardAppliedAt).getTime() >= oneYearAgo
    ).length;

    return NextResponse.json({
      referralCode: m.referralCode,
      referralUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app'}/join?ref=${m.referralCode}`,
      stats: {
        totalReferrals: commissions.length,
        pendingConversions: pending.length,
        inGracePeriod: converted.length,
        earnedRewards: earned.length,
        expiredReferrals: expiredOrReversed.length,
        rewardsEarnedThisYear,
        rewardCapRemaining: Math.max(0, MAX_REWARDS_PER_ROLLING_YEAR - rewardsEarnedThisYear),
        rewardCapTotal: MAX_REWARDS_PER_ROLLING_YEAR,
      },
      commissions: commissions.map(c => ({
        id: c._id,
        referredMerchantId: c.referredMerchantId,
        referralCode: c.referralCode,
        status: c.status,
        createdAt: c.createdAt,
        expiresAt: c.expiresAt,
        convertedAt: c.convertedAt,
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
