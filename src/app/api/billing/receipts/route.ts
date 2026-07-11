import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { BillingReceipt } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * GET /api/billing/receipts — the merchant's own subscription-charge history, most recent
 * first. Interim receipt system (see BillingReceipt model / recordAndNotifyReceipt) — not a
 * formal Thai tax invoice, just a queryable payment record surfaced in Billing settings.
 */
export async function GET(req: NextRequest) {
  const session = getMerchantFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const receipts = await BillingReceipt.find({ merchantId: session.merchantId })
      .sort({ createdAt: -1 })
      .limit(24)
      .select('omiseChargeId tier amountTHB periodStart periodEnd cardBrand cardLast4 createdAt')
      .lean();

    return NextResponse.json({ receipts });
  } catch (err) {
    console.error('[billing/receipts]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
