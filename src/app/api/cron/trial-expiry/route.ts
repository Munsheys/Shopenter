import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, AffiliateCommission } from '@/models';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Verify cron secret from request header
  const cronSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const now = new Date();

    // Find all merchants with expired trials
    const expiredMerchants = await Merchant.find({
      paymentStatus: 'trialing',
      trialEndsAt: { $lt: now },
    });

    let rewardedCount = 0;

    // For each expired trial, handle affiliate rewards if they were referred
    for (const merchant of expiredMerchants) {
      if (merchant.referredByMerchantId) {
        const referrer = await Merchant.findById(merchant.referredByMerchantId);
        if (referrer && referrer.affiliateRewardsEarnedThisYear < 12) {
          // Mark commission as earned
          await AffiliateCommission.findOneAndUpdate(
            {
              referrer: merchant.referredByMerchantId,
              referred: merchant._id,
              status: 'pending',
            },
            {
              $set: {
                status: 'earned',
                earnedAt: now,
              },
            }
          );

          // Extend referrer's trial by 30 days
          const newTrialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await Merchant.findByIdAndUpdate(
            merchant.referredByMerchantId,
            {
              $set: {
                trialEndsAt: newTrialEnd,
              },
              $inc: {
                affiliateRewardsEarnedThisYear: 1,
              },
            }
          );

          rewardedCount++;
        }
      }
    }

    // Update all expired trial merchants to paid/free
    const expiredTrials = await Merchant.updateMany(
      {
        paymentStatus: 'trialing',
        trialEndsAt: { $lt: now },
      },
      {
        $set: {
          paymentStatus: 'paid',
          tier: 'free',
          trialEndsAt: null,
        },
      }
    );

    // Expire old affiliate commissions (pending after 30 days)
    const expiredCommissions = await AffiliateCommission.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: now },
      },
      {
        $set: { status: 'expired' },
      }
    );

    return NextResponse.json({
      message: 'Trial expiry cron completed',
      expiredTrials: expiredTrials.modifiedCount,
      rewardedAffiliates: rewardedCount,
      expiredCommissions: expiredCommissions.modifiedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[trial-expiry cron]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
