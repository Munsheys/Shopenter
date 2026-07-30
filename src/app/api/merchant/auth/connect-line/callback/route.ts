import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { exchangeLineCode } from '@/lib/lineOAuth';
import { logAudit } from '@/lib/auditLog';
import { clearInactivityDeletion } from '@/lib/inactivity';

export const runtime = 'nodejs';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app';
const SETTINGS_ACCOUNT_URL = `${BASE_URL}/dashboard?tab=settings&section=account`;

export async function GET(req: NextRequest) {
  const session = getMerchantFromRequest(req);
  if (!session) return NextResponse.redirect(`${BASE_URL}/login`);

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${SETTINGS_ACCOUNT_URL}&linkError=${error}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${SETTINGS_ACCOUNT_URL}&linkError=invalid_request`);
  }

  const cookieState = req.cookies.get('connect_line_state')?.value;
  const cookieNonce = req.cookies.get('connect_line_nonce')?.value;
  if (!cookieState || cookieState !== state || !cookieNonce) {
    return NextResponse.redirect(`${SETTINGS_ACCOUNT_URL}&linkError=state_mismatch`);
  }

  const redirectUri = `${BASE_URL}/api/merchant/auth/connect-line/callback`;
  const profile = await exchangeLineCode(code, redirectUri, cookieNonce);
  if (!profile) {
    return NextResponse.redirect(`${SETTINGS_ACCOUNT_URL}&linkError=line_auth_failed`);
  }

  await dbConnect();

  const alreadyLinkedElsewhere = await Merchant.findOne({ lineUserId: profile.lineUserId });
  if (alreadyLinkedElsewhere && alreadyLinkedElsewhere._id.toString() !== session.merchantId) {
    return NextResponse.redirect(`${SETTINGS_ACCOUNT_URL}&linkError=line_already_linked`);
  }

  const merchant = await Merchant.findById(session.merchantId);
  if (!merchant) return NextResponse.redirect(`${BASE_URL}/login`);

  merchant.lineUserId = profile.lineUserId;
  merchant.lineAccessToken = profile.accessToken;
  clearInactivityDeletion(merchant);
  await merchant.save();

  await logAudit({ merchantId: merchant._id.toString(), action: 'line_account_linked', resource: 'merchant', status: 'success' }, req);

  const res = NextResponse.redirect(`${SETTINGS_ACCOUNT_URL}&linked=line`);
  res.cookies.set('connect_line_state', '', { maxAge: 0, path: '/' });
  res.cookies.set('connect_line_nonce', '', { maxAge: 0, path: '/' });
  return res;
}
