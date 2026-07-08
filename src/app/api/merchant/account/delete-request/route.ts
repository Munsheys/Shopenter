import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

export const runtime = 'nodejs';

const GRACE_PERIOD_DAYS = 30;

/**
 * POST /api/merchant/account/delete-request
 * Schedules the account for permanent deletion after a 30-day grace period
 * (matches the Terms of Service / Merchant Agreement termination policy).
 * Requires the merchant to type their exact shop name as confirmation, since
 * this is destructive and there is no "are you sure" dialog on the API layer.
 * Ends the current session immediately; the merchant can still log back in
 * during the grace period to export data or cancel the deletion.
 */
export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { confirmShopName } = body;
  if (typeof confirmShopName !== 'string' || !confirmShopName.trim()) {
    return NextResponse.json({ error: 'confirmShopName is required' }, { status: 400 });
  }

  try {
    await dbConnect();

    const merchantDoc = await Merchant.findById(merchant.merchantId);
    if (!merchantDoc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (merchantDoc.deletionScheduledFor) {
      return NextResponse.json(
        { error: 'Deletion already scheduled', deletionScheduledFor: merchantDoc.deletionScheduledFor },
        { status: 409 }
      );
    }

    if (confirmShopName.trim().toLowerCase() !== (merchantDoc.shopName || '').trim().toLowerCase()) {
      return NextResponse.json({ error: 'Shop name confirmation does not match' }, { status: 400 });
    }

    const now = new Date();
    const scheduledFor = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    merchantDoc.deletionRequestedAt = now;
    merchantDoc.deletionScheduledFor = scheduledFor;
    await merchantDoc.save();

    await logAudit(
      { merchantId: merchant.merchantId, action: 'account_deletion_requested', resource: 'merchant', status: 'success' },
      req
    );

    const res = NextResponse.json({
      success: true,
      deletionScheduledFor: scheduledFor,
      message: `Your account is scheduled for permanent deletion on ${scheduledFor.toISOString().slice(0, 10)}. You can log back in any time before then to export your data or cancel this request.`,
    });

    // End this session immediately — matches "account access revoked immediately" in the ToS.
    res.cookies.set('merchant_token', '', { maxAge: 0, path: '/' });
    return res;
  } catch (error) {
    console.error('[account delete-request]', error);
    return NextResponse.json({ error: 'Failed to schedule account deletion' }, { status: 500 });
  }
}
