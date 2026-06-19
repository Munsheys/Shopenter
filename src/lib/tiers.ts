export const TIER_LIMITS = {
  free: {
    products: 10,
    ordersPerMonth: 100,
    autoReplies: 3,
    csvExport: false,
    discountCodes: false,
    loyalty: false,
    affiliateProgram: false,
  },
  pro: {
    products: 500,
    ordersPerMonth: 10000,
    autoReplies: 100,
    csvExport: true,
    discountCodes: true,
    loyalty: true,
    affiliateProgram: true,
  },
  enterprise: {
    products: -1,
    ordersPerMonth: -1,
    autoReplies: -1,
    csvExport: true,
    discountCodes: true,
    loyalty: true,
    affiliateProgram: true,
  },
} as const;

export type Tier = keyof typeof TIER_LIMITS;
export type TierFeature = keyof typeof TIER_LIMITS.free;

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
  feature: 'csvExport' | 'discountCodes' | 'loyalty' | 'affiliateProgram'
): boolean {
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  return Boolean(limits[feature]);
}

export function getTierLabel(tier: Tier): string {
  return { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }[tier] ?? 'Free';
}
