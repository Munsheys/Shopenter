import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { checkAuthLimit, getClientIp } from '@/lib/rateLimiter';

export const runtime = 'nodejs';

/**
 * Starts the "connect LINE to my already-logged-in account" flow — distinct from
 * /api/auth/line/authorize (sign-in), which never touches an existing session. This one
 * requires one already. It reuses the SAME registered callback URL as the sign-in flow
 * (/api/auth/line/callback) rather than a second one — LINE Login channels only expose a
 * single editable Callback URL field in the console, so a second route would need the
 * merchant to hand-manage two URLs there. The shared callback route tells the two flows
 * apart by which state cookie is present (connect_line_state vs line_auth_state) and, for
 * this one, by the still-live merchant_token session cookie surviving the redirect round-trip.
 */
export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req);
  const limitCheck = await checkAuthLimit(ip);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  await dbConnect();
  const doc = await Merchant.findById(merchant.merchantId).select('lineUserId').lean() as any;
  if (doc?.lineUserId) {
    return NextResponse.json({ error: 'This account already has a LINE login connected.' }, { status: 409 });
  }

  const channelId = process.env.LINE_CHANNEL_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app'}/api/auth/line/callback`;
  if (!channelId) {
    return NextResponse.json({ error: 'LINE_CHANNEL_ID is not configured' }, { status: 500 });
  }

  const state = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(32).toString('hex');

  const res = NextResponse.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${new URLSearchParams({
      response_type: 'code',
      client_id: channelId,
      redirect_uri: redirectUri,
      state,
      scope: 'profile openid email',
      nonce,
    }).toString()}`
  );

  res.cookies.set('connect_line_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });
  res.cookies.set('connect_line_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });

  return res;
}
