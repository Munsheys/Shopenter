import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

export const runtime = 'nodejs';

/**
 * Cancels auto-renewal. Per Terms §11 / Merchant Agreement §10: no refund for
 * the partial period, but access continues until the period you already paid
 * for ends — the billing-cycle cron downgrades to Free once nextBillingDate
 * passes for a canceled subscription instead of attempting another charge.
 */
export async function POST(req: NextRequest) {
  const session = getMerchantFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const merchant = await Merchant.findById(session.merchantId);
    if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (merchant.subscriptionStatus !== 'active' && merchant.subscriptionStatus !== 'past_due') {
      return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 });
    }

    merchant.subscriptionStatus = 'canceled';
    await merchant.save();

    await logAudit(
      { merchantId: merchant._id.toString(), action: 'subscription_canceled', resource: 'merchant', status: 'success' },
      req
    );

    return NextResponse.json({ subscriptionStatus: merchant.subscriptionStatus, accessUntil: merchant.nextBillingDate });
  } catch (err) {
    console.error('[billing/cancel]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
