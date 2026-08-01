// Referral program: the referred user gets a shorter no-card trial as the hook to sign
// up, while the referrer's reward — once the referred merchant actually subscribes and
// pays — is a full billing cycle (30 days), since that maps cleanly onto Shopenter's
// monthly billing and reads as "a month of Pro" rather than an odd day count. Capped per
// rolling year so referrals can't be farmed into indefinite free service.
export const REFERRED_TRIAL_DAYS = 14;

export const REWARD_DAYS = 30;
export const MAX_REWARDS_PER_ROLLING_YEAR = 3; // 3 * 30 = 90 days/year max, not a free year

// A referred merchant must stay paid for this long before the referrer's reward locks in,
// so canceling right after "converting" doesn't farm rewards.
export const CONVERSION_GRACE_DAYS = 7;

// How long after the referred trial ends a pending referral can still convert.
export const PENDING_GRACE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY_MS);
}
