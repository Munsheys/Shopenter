import { pushShopenterLineMessage } from '@/lib/shopenterLine';

// Shared "you're now on Free" template for every path that can downgrade a merchant,
// so the three call sites (trial-expiry, billing-cycle x2) can't drift into inconsistent
// copy. LINE-only for now, same policy as every other Shopenter->merchant notice — merchants
// without a linked LINE account aren't reachable yet (see billingReceipt.ts).
export type DowngradeReason = 'trial_ended' | 'payment_failed' | 'cancelled';

const DOWNGRADE_REASON_TEXT: Record<DowngradeReason, string> = {
  trial_ended: "Your Pro trial ended without a payment method on file",
  payment_failed: "We weren't able to charge your card after repeated attempts",
  cancelled: "Your paid subscription period has ended",
};

export async function notifyDowngradeToFree(
  lineUserId: string | null | undefined,
  shopName: string,
  reason: DowngradeReason
): Promise<void> {
  if (!lineUserId) return;
  try {
    const text = `📉 ${DOWNGRADE_REASON_TEXT[reason]}, so ${shopName} is now on the Free tier.\n\nYou can upgrade again anytime from your dashboard.`;
    await pushShopenterLineMessage(lineUserId, text);
  } catch (err) {
    console.error('[subscriptionNotify] downgrade push failed', err);
  }
}

export async function notifyPaymentFailed(
  lineUserId: string | null | undefined,
  shopName: string,
  graceDays: number
): Promise<void> {
  if (!lineUserId) return;
  try {
    const text = `⚠️ We couldn't charge your card for ${shopName}'s Pro subscription. Please update your payment method within ${graceDays} days to avoid being moved to the Free tier.`;
    await pushShopenterLineMessage(lineUserId, text);
  } catch (err) {
    console.error('[subscriptionNotify] payment-failed push failed', err);
  }
}

export async function notifyReferralRewardEarned(
  lineUserId: string | null | undefined,
  shopName: string,
  rewardDays: number
): Promise<void> {
  if (!lineUserId) return;
  try {
    const text = `🎉 Someone you referred to Shopenter just subscribed to Pro! You've earned ${rewardDays} days of free Pro service for ${shopName}.`;
    await pushShopenterLineMessage(lineUserId, text);
  } catch (err) {
    console.error('[subscriptionNotify] referral-reward push failed', err);
  }
}
