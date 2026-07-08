export const TIER_LIMITS = {
  free: {
    products: 10,
    ordersPerMonth: 100,
    autoReplies: 3,
    discountCodes: false,
    loyalty: false,
    affiliateProgram: false,
  },
  pro: {
    products: 500,
    ordersPerMonth: 10000,
    autoReplies: 100,
    discountCodes: true,
    loyalty: true,
    affiliateProgram: true,
  },
  enterprise: {
    products: -1,
    ordersPerMonth: -1,
    autoReplies: -1,
    discountCodes: true,
    loyalty: true,
    affiliateProgram: true,
  },
} as const;

export type Tier = keyof typeof TIER_LIMITS;
export type TierFeature = keyof typeof TIER_LIMITS.free;

// Only 'pro' is self-serve/card-billed via Omise. Enterprise pricing is arranged
// individually and activated manually, not through the checkout flow.
export const TIER_PRICE_THB: Partial<Record<Tier, number>> = {
  pro: 299,
};

// How long a merchant can stay past_due (after a failed recurring charge)
// before the cron auto-downgrades them to the free tier.
export const BILLING_GRACE_PERIOD_DAYS = 3;

export function checkCountLimit(
  tier: Tier,
  feature: 'products' | 'ordersPerMonth' | 'autoReplies',
  currentCount: number
): { allowed: boolean; limit: number; upgrade: boolean } {
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  const limit = limits[feature] as number;
  if (limit === -1) return { allowed: true, limit: -1, upgrade: false };
  const allowed = currentCount < limit;
  return { allowed, limit, upgrade: !allowed };
}

export function checkBooleanFeature(
  tier: Tier,
  feature: 'discountCodes' | 'loyalty' | 'affiliateProgram'
): boolean {
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  return Boolean(limits[feature]);
}

export function getTierLabel(tier: Tier): string {
  return { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }[tier] ?? 'Free';
}
