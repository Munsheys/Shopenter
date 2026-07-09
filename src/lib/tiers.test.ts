import { describe, it, expect } from 'vitest';
import { checkCountLimit, checkBooleanFeature, getTierLabel, TIER_LIMITS } from './tiers';

describe('checkCountLimit', () => {
  it('allows usage under the limit', () => {
    const result = checkCountLimit('free', 'products', 5);
    expect(result).toEqual({ allowed: true, limit: TIER_LIMITS.free.products, upgrade: false });
  });

  it('blocks usage at or over the limit and suggests upgrade', () => {
    const result = checkCountLimit('free', 'products', TIER_LIMITS.free.products);
    expect(result.allowed).toBe(false);
    expect(result.upgrade).toBe(true);
  });

  it('treats -1 as unlimited (enterprise)', () => {
    const result = checkCountLimit('enterprise', 'ordersPerMonth', 1_000_000);
    expect(result).toEqual({ allowed: true, limit: -1, upgrade: false });
  });

  it('falls back to free tier limits for an unrecognized tier', () => {
    // @ts-expect-error deliberately passing an invalid tier to test the fallback
    const result = checkCountLimit('bogus', 'products', 0);
    expect(result.limit).toBe(TIER_LIMITS.free.products);
  });
});

describe('checkBooleanFeature', () => {
  it('free tier has discount codes disabled', () => {
    expect(checkBooleanFeature('free', 'discountCodes')).toBe(false);
  });

  it('pro tier has discount codes, loyalty, and affiliate program enabled', () => {
    expect(checkBooleanFeature('pro', 'discountCodes')).toBe(true);
    expect(checkBooleanFeature('pro', 'loyalty')).toBe(true);
    expect(checkBooleanFeature('pro', 'affiliateProgram')).toBe(true);
  });
});

describe('getTierLabel', () => {
  it('returns a human label for each known tier', () => {
    expect(getTierLabel('free')).toBe('Free');
    expect(getTierLabel('pro')).toBe('Pro');
    expect(getTierLabel('enterprise')).toBe('Enterprise');
  });
});
