export const TIER_LIMITS = {
  free: {
    products: -1,
    ordersPerMonth: -1,
    campaigns: -1,
    autoReplies: -1,
    csvExport: true,
    discountCodes: true,
    loyalty: true,
    analyticsWindowDays: 30,
  },
  pro: {
    products: -1,
    ordersPerMonth: -1,
    campaigns: -1,
    autoReplies: -1,
    csvExport: true,
    discountCodes: true,
    loyalty: true,
    analyticsWindowDays: 365,
  },
  enterprise: {
    products: -1,
    ordersPerMonth: -1,
    campaigns: -1,
    autoReplies: -1,
    csvExport: true,
    discountCodes: true,
    loyalty: true,
    analyticsWindowDays: Infinity,
  },
} as const;

export type Tier = keyof typeof TIER_LIMITS;
export type TierFeature = keyof typeof TIER_LIMITS.free;

export function checkCountLimit(
  tier: Tier,
  feature: 'products' | 'ordersPerMonth' | 'campaigns' | 'autoReplies',
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
  feature: 'csvExport' | 'discountCodes' | 'loyalty'
): boolean {
  return true;
}

export function getAnalyticsWindowDays(tier: Tier): number {
  return TIER_LIMITS[tier]?.analyticsWindowDays ?? 30;
}

export function getTierLabel(tier: Tier): string {
  return { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }[tier] ?? 'Free';
}
