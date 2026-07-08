import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { logAudit } from '@/lib/auditLog';
import { getChargeById } from '@/lib/omise';

export const runtime = 'nodejs';

/**
 * Omise webhook receiver. The primary billing loop is driven by
 * /api/cron/billing-cycle (Omise doesn't auto-charge on a schedule), so this
 * mainly catches events that happen outside that cycle — e.g. a charge
 * reversed/disputed from the Omise dashboard. We never trust the webhook
 * body's status directly; we re-fetch the charge by ID from Omise first.
 */
export async function POST(req: NextRequest) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const chargeId = payload?.data?.id;
  if (!chargeId || typeof chargeId !== 'string') {
    // Not a charge event we act on — acknowledge so Omise doesn't retry forever.
    return NextResponse.json({ received: true });
  }

  try {
    await dbConnect();
    const charge = await getChargeById(chargeId);
    if (charge.status === 'successful') {
      return NextResponse.json({ received: true });
    }

    const merchant = await Merchant.findOne({ omiseCustomerId: charge.customer });
    if (!merchant) return NextResponse.json({ received: true });

    if (merchant.subscriptionStatus === 'active') {
      merchant.subscriptionStatus = 'past_due';
      merchant.pastDueSince = merchant.pastDueSince ?? new Date();
      await merchant.save();
      await logAudit({ merchantId: merchant._id.toString(), action: 'subscription_charge_failed', resource: 'merchant', status: 'failed', errorMessage: charge.failure_message || `Charge status: ${charge.status}` });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook/omise]', err);
    // Still 200 — we don't want Omise retrying indefinitely on our transient errors.
    return NextResponse.json({ received: true });
  }
}
