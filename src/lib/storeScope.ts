import { Merchant } from '@/models';

/**
 * Resolve the merchant a *single-tenant legacy* storefront request belongs to.
 *
 * The legacy `/shop` page and its `/api/shop-info` + `/api/qr` endpoints were
 * written before multi-tenancy and used unfiltered `Settings.findOne()`, which
 * returns an arbitrary tenant's document once more than one merchant exists.
 *
 * Resolution order (first match wins):
 *   1. explicit `merchantId` from the request (dashboard flows pass this)
 *   2. `DEFAULT_MERCHANT_ID` env var (pin the legacy shop to a specific tenant)
 *   3. the oldest merchant — deterministic "original shop" fallback, so the
 *      result is stable rather than whatever Mongo happens to return first.
 *
 * Returns null only when there are no merchants at all.
 */
export async function resolveStoreMerchantId(explicit?: string | null): Promise<string | null> {
  if (explicit && explicit.trim()) return explicit.trim();
  if (process.env.DEFAULT_MERCHANT_ID) return process.env.DEFAULT_MERCHANT_ID;
  const oldest = await Merchant.findOne().sort({ _id: 1 }).select('_id').lean() as any;
  return oldest?._id ? String(oldest._id) : null;
}
