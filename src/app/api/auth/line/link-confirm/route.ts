import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { verifyLineLinkToken, signMerchantToken, comparePassword } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { checkAuthLimit, getClientIp } from '@/lib/rateLimiter';
import { clearInactivityDeletion } from '@/lib/inactivity';

export const runtime = 'nodejs';

// Lets the /login/link-line page show which email is pending, without exposing the
// httpOnly cookie itself to client JS. The email isn't secret; the point of the cookie
// being httpOnly is to stop it being tampered with, not to hide this from its own owner.
export async function GET(req: NextRequest) {
  const token = req.cookies.get('line_link_pending')?.value;
  if (!token) return NextResponse.json({ error: 'expired' }, { status: 410 });

  try {
    const pending = verifyLineLinkToken(token);
    return NextResponse.json({ email: pending.email });
  } catch {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limitCheck = await checkAuthLimit(ip);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const token = req.cookies.get('line_link_pending')?.value;
  if (!token) return NextResponse.json({ error: 'This link request has expired. Please try signing in with LINE again.' }, { status: 410 });

  let pending;
  try {
    pending = verifyLineLinkToken(token);
  } catch {
    return NextResponse.json({ error: 'This link request has expired. Please try signing in with LINE again.' }, { status: 410 });
  }

  const { password } = await req.json();
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  await dbConnect();
  const merchant = await Merchant.findOne({ email: pending.email });
  if (!merchant || !merchant.passwordHash) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const valid = await comparePassword(password, merchant.passwordHash);
  if (!valid) {
    await logAudit({ merchantId: merchant._id.toString(), action: 'line_link_failed', resource: 'merchant', status: 'failed', errorMessage: 'Incorrect password' }, req);
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  // A LINE identity can only ever be attached to one account.
  const alreadyLinkedElsewhere = await Merchant.findOne({ lineUserId: pending.lineUserId });
  if (alreadyLinkedElsewhere && alreadyLinkedElsewhere._id.toString() !== merchant._id.toString()) {
    return NextResponse.json({ error: 'This LINE account is already connected to a different Shopenter account.' }, { status: 409 });
  }

  merchant.lineUserId = pending.lineUserId;
  merchant.lineAccessToken = pending.lineAccessToken;
  merchant.lastLoginAt = new Date();
  merchant.lastLoginMethod = 'line_oauth';
  clearInactivityDeletion(merchant);
  await merchant.save();

  await logAudit({ merchantId: merchant._id.toString(), action: 'line_account_linked', resource: 'merchant', status: 'success' }, req);

  const sessionToken = signMerchantToken({ merchantId: merchant._id.toString(), email: merchant.email });

  const res = NextResponse.json({ success: true });
  res.cookies.set('merchant_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  res.cookies.set('line_link_pending', '', { maxAge: 0, path: '/' });

  return res;
}
