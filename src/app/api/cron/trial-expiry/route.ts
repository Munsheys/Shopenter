import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, AffiliateCommission } from '@/models';
import { REWARD_DAYS, MAX_REWARDS_PER_ROLLING_YEAR, CONVERSION_GRACE_DAYS, daysFromNow } from '@/lib/affiliate';

export const runtime = 'nodejs';

async function rewardsEarnedInRollingYear(referrerMerchantId: any): Promise<number> {
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  return AffiliateCommission.countDocuments({
    referrerMerchantId,
    status: 'earned',
    rewardAppliedAt: { $gte: oneYearAgo, $ne: null },
  });
}

// Returns whether the reward was actually applied. Rewards are granted as
// "free Pro time" via the trial mechanism rather than a real refund/credit,
// which only makes sense for a referrer who isn't already a genuine paying
// customer (otherwise the next expiry sweep would wrongly downgrade them to
// free once the bonus period lapses).
async function applyReferrerReward(referrerMerchantId: any): Promise<boolean> {
  const referrer = await Merchant.findById(referrerMerchantId);
  if (!referrer) return false;
  if (referrer.tier === 'enterprise') return false;
  if (referrer.paymentStatus === 'paid') return false;

  const base = referrer.trialEndsAt && referrer.trialEndsAt > new Date() ? referrer.trialEndsAt : new Date();
  const newTrialEnd = new Date(base.getTime() + REWARD_DAYS * 24 * 60 * 60 * 1000);

  referrer.tier = 'pro';
  referrer.paymentStatus = 'trialing';
  referrer.trialEndsAt = newTrialEnd;
  referrer.trialReason = 'affiliate_reward';
  await referrer.save();
  return true;
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
    const expiredTrials = await Merchant.updateMany(
      { paymentStatus: 'trialing', trialEndsAt: { $lt: now }, omiseCustomerId: null },
      { $set: { paymentStatus: 'paid', tier: 'free', trialEndsAt: null } }
    );

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
        const applied = await applyReferrerReward(commission.referrerMerchantId);
        if (applied) {
          await AffiliateCommission.updateOne({ _id: commission._id }, { $set: { rewardAppliedAt: now } });
          rewardedCount++;
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
