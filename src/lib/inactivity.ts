// 3 months of no login is the inactivity signal; the actual deletion still goes through
// the same 30-day grace period as a merchant-requested deletion (see deletionScheduledFor).
export const INACTIVITY_THRESHOLD_DAYS = 90;

/**
 * Clears a system-scheduled (not merchant-requested) deletion. Logging back in is treated
 * as proof the merchant is still around — no separate "cancel" click needed. A deletion the
 * merchant explicitly requested themselves is untouched; that still requires the dedicated
 * cancel-deletion endpoint.
 */
export function clearInactivityDeletion(merchant: any): boolean {
  if (merchant.deletionReason !== 'inactivity') return false;
  merchant.deletionRequestedAt = null;
  merchant.deletionScheduledFor = null;
  merchant.deletionReason = null;
  merchant.inactivityWarningStage = 0;
  return true;
}
