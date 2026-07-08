import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

export const runtime = 'nodejs';

/**
 * POST /api/merchant/account/cancel-deletion
 * Reverses a pending account deletion during the 30-day grace period.
 * Requires a valid session, so the merchant must log back in first —
 * the normal login/LINE OAuth routes do not block on a pending deletion.
 */
export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();

    const merchantDoc = await Merchant.findById(merchant.merchantId);
    if (!merchantDoc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!merchantDoc.deletionScheduledFor) {
      return NextResponse.json({ error: 'No deletion is currently scheduled' }, { status: 400 });
    }

    merchantDoc.deletionRequestedAt = null;
    merchantDoc.deletionScheduledFor = null;
    await merchantDoc.save();

    await logAudit(
      { merchantId: merchant.merchantId, action: 'account_deletion_cancelled', resource: 'merchant', status: 'success' },
      req
    );

    return NextResponse.json({ success: true, message: 'Account deletion has been cancelled.' });
  } catch (error) {
    console.error('[account cancel-deletion]', error);
    return NextResponse.json({ error: 'Failed to cancel account deletion' }, { status: 500 });
  }
}
