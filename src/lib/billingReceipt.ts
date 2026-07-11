import { BillingReceipt } from '@/models';
import { pushShopenterLineMessage } from '@/lib/shopenterLine';

/**
 * Record a BillingReceipt for a successful subscription charge and, if the merchant has a
 * linked LINE account, push them a receipt message via Shopenter's own LINE OA. Called from
 * both the initial checkout charge and each billing-cycle renewal charge — kept as one
 * shared helper so the two call sites can't drift.
 *
 * Interim receipt system, not a formal Thai tax invoice — numbering/format for that is a
 * separate accountant deliverable (see plan). This just gives merchants a permanent,
 * queryable payment record and a proactive notification, same LINE-only policy as every
 * other Shopenter->merchant notice.
 *
 * Deliberately never throws. Both call sites invoke this *after* the merchant's charge has
 * already succeeded and their subscription state has already been saved — a network hiccup
 * on the LINE push or a transient DB error here must never be allowed to propagate into the
 * caller's catch block and undo already-correct state (e.g. the billing-cycle cron would
 * otherwise mark a successfully-charged merchant 'past_due', or checkout would 500 an
 * already-successful upgrade, risking a duplicate charge on client retry). Same
 * log-and-continue posture as the ProcessedEvent idempotency guard in api/webhook/route.ts.
 */
export async function recordAndNotifyReceipt(params: {
  merchantId: string;
  lineUserId?: string | null;
  shopName: string;
  omiseChargeId: string;
  tier: string;
  amountTHB: number;
  periodStart: Date;
  periodEnd: Date;
  cardBrand?: string | null;
  cardLast4?: string | null;
}): Promise<void> {
  const { merchantId, lineUserId, shopName, omiseChargeId, tier, amountTHB, periodStart, periodEnd, cardBrand, cardLast4 } = params;

  try {
    await BillingReceipt.create({
      merchantId,
      omiseChargeId,
      tier,
      amountTHB,
      periodStart,
      periodEnd,
      cardBrand: cardBrand ?? '',
      cardLast4: cardLast4 ?? '',
    });
  } catch (err: any) {
    // Duplicate charge id (e.g. a retried cron run) — the receipt already exists, nothing to do.
    if (err?.code === 11000) return;
    console.error('[billingReceipt] Failed to record receipt:', err);
    return;
  }

  if (!lineUserId) return; // email-only merchant, never linked LINE — no channel to notify on yet

  try {
    const cardText = cardBrand && cardLast4 ? `\n💳 ${cardBrand} •••• ${cardLast4}` : '';
    const dateText = periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const text = `🧾 Payment receipt\n\n${shopName}\nPlan: ${tier.charAt(0).toUpperCase()}${tier.slice(1)}\nAmount: ฿${amountTHB.toLocaleString()}${cardText}\nNext billing: ${dateText}\n\nRef: ${omiseChargeId}`;
    await pushShopenterLineMessage(lineUserId, text);
  } catch (err) {
    console.error('[billingReceipt] Failed to push LINE receipt:', err);
  }
}
