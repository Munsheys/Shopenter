import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, AffiliateCommission } from '@/models';
import { REWARD_DAYS, MAX_REWARDS_PER_ROLLING_YEAR, CONVERSION_GRACE_DAYS, daysFromNow } from '@/lib/affiliate';
import { notifyDowngradeToFree, notifyReferralRewardEarned } from '@/lib/subscriptionNotify';

export const runtime = 'nodejs';

async function rewardsEarnedInRollingYear(referrerMerchantId: any): Promise<number> {
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  return AffiliateCommission.countDocuments({
    referrerMerchantId,
    status: 'earned',
    rewardAppliedAt: { $gte: oneYearAgo, $ne: null },
  });
}

// Returns the referrer doc if the reward was actually applied, else null. Rewards are
// granted as "free Pro time" via the trial mechanism rather than a real refund/credit,
// which only makes sense for a referrer who isn't already a genuine paying
// customer (otherwise the next expiry sweep would wrongly downgrade them to
// free once the bonus period lapses).
async function applyReferrerReward(referrerMerchantId: any) {
  const referrer = await Merchant.findById(referrerMerchantId);
  if (!referrer) return null;
  if (referrer.tier === 'enterprise') return null;
  if (referrer.paymentStatus === 'paid') return null;

  const base = referrer.trialEndsAt && referrer.trialEndsAt > new Date() ? referrer.trialEndsAt : new Date();
  const newTrialEnd = new Date(base.getTime() + REWARD_DAYS * 24 * 60 * 60 * 1000);

  referrer.tier = 'pro';
  referrer.paymentStatus = 'trialing';
  referrer.trialEndsAt = newTrialEnd;
  referrer.trialReason = 'affiliate_reward';
  await referrer.save();
  return referrer;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const now = new Date();

    // Trials that ran out without converting roll down to the free tier. Only for
    // no-card trials (referral) — card-backed trials (omiseCustomerId set) are handled
    // by the billing-cycle cron instead, which attempts the real charge at trial end.
    // Fetched first (rather than a bare updateMany) so each downgraded merchant can be
    // notified — the update itself isn't gated on delivery since this isn't destructive
    // the way an account deletion is; a missed notification just means the merchant finds
    // out from the dashboard instead of a LINE push.
    const lapsedTrialMerchants = await Merchant.find(
      { paymentStatus: 'trialing', trialEndsAt: { $lt: now }, omiseCustomerId: null },
      'lineUserId shopName'
    );
    const expiredTrials = await Merchant.updateMany(
      { paymentStatus: 'trialing', trialEndsAt: { $lt: now }, omiseCustomerId: null },
      { $set: { paymentStatus: 'paid', tier: 'free', trialEndsAt: null } }
    );
    for (const m of lapsedTrialMerchants) {
      await notifyDowngradeToFree(m.lineUserId, m.shopName, 'trial_ended');
    }

    // Promote conversions that survived the anti-abuse grace window into earned rewards.
    const graceCutoff = daysFromNow(-CONVERSION_GRACE_DAYS);
    const readyToResolve = await AffiliateCommission.find({
      status: 'converted',
      convertedAt: { $lte: graceCutoff },
    });

    let earnedCount = 0;
    let reversedCount = 0;
    let rewardedCount = 0;

    for (const commission of readyToResolve) {
      const referred = await Merchant.findById(commission.referredMerchantId);
      const stillPaid = referred && referred.paymentStatus === 'paid' && referred.tier !== 'free';

      if (!stillPaid) {
        await AffiliateCommission.updateOne(
          { _id: commission._id, status: 'converted' },
          { $set: { status: 'reversed' } }
        );
        reversedCount++;
        continue;
      }

      // Atomically claim the commission before granting any reward, so a retried or
      // concurrent cron run can't apply the same reward twice.
      const claimed = await AffiliateCommission.findOneAndUpdate(
        { _id: commission._id, status: 'converted' },
        { $set: { status: 'earned', earnedAt: now } }
      );
      if (!claimed) continue;
      earnedCount++;

      const earnedThisYear = await rewardsEarnedInRollingYear(commission.referrerMerchantId);
      if (earnedThisYear < MAX_REWARDS_PER_ROLLING_YEAR) {
        const referrer = await applyReferrerReward(commission.referrerMerchantId);
        if (referrer) {
          await AffiliateCommission.updateOne({ _id: commission._id }, { $set: { rewardAppliedAt: now } });
          rewardedCount++;
          await notifyReferralRewardEarned(referrer.lineUserId, referrer.shopName, REWARD_DAYS);
        }
      }
    }

    // Referrals that never converted within their window are gone for good.
    const expiredCommissions = await AffiliateCommission.updateMany(
      { status: 'pending', expiresAt: { $lt: now } },
      { $set: { status: 'expired' } }
    );

    return NextResponse.json({
      message: 'Trial expiry cron completed',
      expiredTrials: expiredTrials.modifiedCount,
      earnedCommissions: earnedCount,
      rewardedAffiliates: rewardedCount,
      reversedCommissions: reversedCount,
      expiredCommissions: expiredCommissions.modifiedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[trial-expiry cron]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
