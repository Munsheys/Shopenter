// Acquisition-first affiliate program: the referred user gets the big incentive
// (longer trial) since that's what actually drives signups. The referrer's reward
// is deliberately small and capped so referrals can't be farmed into a free year.
export const ORGANIC_TRIAL_DAYS = 14;
export const REFERRED_TRIAL_DAYS = 30;

export const REWARD_DAYS = 7;
export const MAX_REWARDS_PER_ROLLING_YEAR = 6; // 6 * 7 = 42 days/year max, not a free year

// A referred merchant must stay paid for this long before the referrer's reward locks in,
// so canceling right after "converting" doesn't farm rewards.
export const CONVERSION_GRACE_DAYS = 7;

// How long after the referred trial ends a pending referral can still convert.
export const PENDING_GRACE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY_MS);
}
