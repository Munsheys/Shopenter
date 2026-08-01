import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { logAudit } from '@/lib/auditLog';
import { TIER_PRICE_THB, BILLING_GRACE_PERIOD_DAYS, type Tier } from '@/lib/tiers';
import { chargeCustomer, thbToSatang } from '@/lib/omise';
import { daysFromNow } from '@/lib/affiliate';
import { recordAndNotifyReceipt } from '@/lib/billingReceipt';
import { notifyDowngradeToFree, notifyPaymentFailed } from '@/lib/subscriptionNotify';

export const runtime = 'nodejs';

/**
 * Daily job covering both halves of recurring subscription billing:
 * 1. Attempt the renewal charge for every merchant whose billing date is due.
 * 2. Downgrade merchants who've been past_due longer than the grace period.
 *
 * Omise doesn't auto-charge stored customers on a schedule, so this cron is
 * what actually drives "recurring" billing — it re-charges the customer's
 * default card each cycle using the same customer ID saved at checkout.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const now = new Date();

    let renewed = 0;
    let failed = 0;

    const dueMerchants = await Merchant.find({
      subscriptionStatus: 'active',
      nextBillingDate: { $lte: now },
      omiseCustomerId: { $ne: null },
    });

    for (const merchant of dueMerchants) {
      const priceThb = TIER_PRICE_THB[merchant.tier as Tier];
      if (!priceThb || !merchant.omiseCustomerId) continue;

      try {
        const charge = await chargeCustomer(
          merchant.omiseCustomerId,
          thbToSatang(priceThb),
          `Shopenter ${merchant.tier} subscription renewal — ${merchant.shopName}`
        );

        if (charge.status === 'successful') {
          const periodStart = new Date();
          const periodEnd = daysFromNow(30);
          merchant.nextBillingDate = periodEnd;
          merchant.pastDueSince = null;
          merchant.subscriptionStatus = 'active';
          // Covers the card-required trial converting to a real paid subscription at
          // trial end, as well as ordinary renewals (already 'paid', a no-op there).
          merchant.paymentStatus = 'paid';
          merchant.trialEndsAt = null;
          await merchant.save();
          await logAudit({ merchantId: merchant._id.toString(), action: 'subscription_renewed', resource: 'merchant', status: 'success' });
          await recordAndNotifyReceipt({
            merchantId: merchant._id.toString(),
            lineUserId: merchant.lineUserId,
            shopName: merchant.shopName,
            omiseChargeId: charge.id,
            tier: merchant.tier,
            amountTHB: priceThb,
            periodStart,
            periodEnd,
            cardBrand: merchant.paymentMethodBrand,
            cardLast4: merchant.paymentMethodLast4,
          });
          renewed++;
        } else {
          const wasAlreadyPastDue = Boolean(merchant.pastDueSince);
          merchant.subscriptionStatus = 'past_due';
          merchant.pastDueSince = merchant.pastDueSince ?? now;
          await merchant.save();
          await logAudit({ merchantId: merchant._id.toString(), action: 'subscription_charge_failed', resource: 'merchant', status: 'failed', errorMessage: charge.failure_message || `Charge status: ${charge.status}` });
          if (!wasAlreadyPastDue) await notifyPaymentFailed(merchant.lineUserId, merchant.shopName, BILLING_GRACE_PERIOD_DAYS);
          failed++;
        }
      } catch (err) {
        const wasAlreadyPastDue = Boolean(merchant.pastDueSince);
        merchant.subscriptionStatus = 'past_due';
        merchant.pastDueSince = merchant.pastDueSince ?? now;
        await merchant.save();
        await logAudit({ merchantId: merchant._id.toString(), action: 'subscription_charge_failed', resource: 'merchant', status: 'failed', errorMessage: err instanceof Error ? err.message : 'Unknown error' });
        if (!wasAlreadyPastDue) await notifyPaymentFailed(merchant.lineUserId, merchant.shopName, BILLING_GRACE_PERIOD_DAYS);
        failed++;
      }
    }

    // Past the grace window: revert to Free rather than suspend/delete (Terms §5 / Merchant Agreement §3).
    const graceCutoff = daysFromNow(-BILLING_GRACE_PERIOD_DAYS);
    const toDowngrade = await Merchant.find({
      subscriptionStatus: 'past_due',
      pastDueSince: { $lte: graceCutoff },
    });

    for (const merchant of toDowngrade) {
      merchant.tier = 'free';
      merchant.subscriptionStatus = 'canceled';
      merchant.nextBillingDate = null;
      await merchant.save();
      await logAudit({ merchantId: merchant._id.toString(), action: 'subscription_downgraded', resource: 'merchant', status: 'success' });
      await notifyDowngradeToFree(merchant.lineUserId, merchant.shopName, 'payment_failed');
    }

    // Voluntary cancellations keep access until the already-paid period ends, then drop to Free.
    const lapsedCancellations = await Merchant.find({
      subscriptionStatus: 'canceled',
      nextBillingDate: { $lte: now },
      tier: { $ne: 'free' },
    });

    for (const merchant of lapsedCancellations) {
      merchant.tier = 'free';
      merchant.nextBillingDate = null;
      await merchant.save();
      await logAudit({ merchantId: merchant._id.toString(), action: 'subscription_downgraded', resource: 'merchant', status: 'success' });
      await notifyDowngradeToFree(merchant.lineUserId, merchant.shopName, 'cancelled');
    }

    return NextResponse.json({
      message: 'Billing cycle cron completed',
      renewed,
      failed,
      downgraded: toDowngrade.length + lapsedCancellations.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[billing-cycle cron]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
