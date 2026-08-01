import type { MerchantDoc } from '@/lib/repos/merchant';

// 3 months of no login is the inactivity signal; the actual deletion still goes through
// the same 30-day grace period as a merchant-requested deletion (see deletionScheduledFor).
export const INACTIVITY_THRESHOLD_DAYS = 90;

/**
 * Returns the field updates needed to clear a system-scheduled (not merchant-requested)
 * deletion, or null if there's nothing to clear. Logging back in is treated as proof the
 * merchant is still around — no separate "cancel" click needed. A deletion the merchant
 * explicitly requested themselves is untouched; that still requires the dedicated
 * cancel-deletion endpoint.
 *
 * Pure function (no mutation) — DynamoDB has no Mongoose-style `doc.save()`, so callers
 * merge the returned patch into their own MerchantRepo.update() call.
 */
export function clearInactivityDeletion(merchant: Pick<MerchantDoc, 'deletionReason'>): Partial<MerchantDoc> | null {
  if (merchant.deletionReason !== 'inactivity') return null;
  return {
    deletionRequestedAt: null,
    deletionScheduledFor: null,
    deletionReason: null,
    inactivityWarningStage: 0,
  };
}
