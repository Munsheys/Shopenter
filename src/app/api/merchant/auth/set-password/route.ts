import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest, hashPassword } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { logAudit } from '@/lib/auditLog';

export const runtime = 'nodejs';

/**
 * Lets a LINE-only merchant (no passwordHash) add email/password login to their account.
 * Only for accounts with no password yet — changing an existing password is a different,
 * not-yet-built flow (would need the current password re-entered).
 */
export async function POST(req: NextRequest) {
  const session = getMerchantFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { password } = await req.json();
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  await dbConnect();
  const merchant = await Merchant.findById(session.merchantId);
  if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (merchant.passwordHash) {
    return NextResponse.json({ error: 'This account already has a password set.' }, { status: 409 });
  }

  merchant.passwordHash = await hashPassword(password);
  await merchant.save();

  await logAudit({ merchantId: merchant._id.toString(), action: 'password_set', resource: 'merchant', status: 'success' }, req);

  return NextResponse.json({ success: true });
}
