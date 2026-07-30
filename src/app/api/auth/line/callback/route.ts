import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, Settings } from '@/models';
import { signMerchantToken, signLineLinkToken, getMerchantFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { checkAuthLimit, getClientIp } from '@/lib/rateLimiter';
import { toSlug, generateUniqueSlug } from '@/lib/slug';
import { CURRENT_TERMS_VERSION } from '@/lib/legal';
import { clearInactivityDeletion } from '@/lib/inactivity';
import { exchangeLineCode } from '@/lib/lineOAuth';

export const runtime = 'nodejs';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app';
const SETTINGS_ACCOUNT_URL = `${BASE_URL}/dashboard?tab=settings&section=account`;

/**
 * Handles the "connect LINE to my already-logged-in account" flow (started from
 * Settings > Account). Shares this callback URL with sign-in — see the state-cookie
 * check in GET below for how they're told apart — since LINE Login channels only expose
 * one editable Callback URL in the console.
 */
async function handleConnectCallback(req: NextRequest, code: string, state: string): Promise<NextResponse> {
  const session = getMerchantFromRequest(req);
  if (!session) return NextResponse.redirect(`${BASE_URL}/login`);

  const cookieState = req.cookies.get('connect_line_state')?.value;
  const cookieNonce = req.cookies.get('connect_line_nonce')?.value;
  if (!cookieState || cookieState !== state || !cookieNonce) {
    return NextResponse.redirect(`${SETTINGS_ACCOUNT_URL}&linkError=state_mismatch`);
  }

  const redirectUri = `${BASE_URL}/api/auth/line/callback`;
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

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limitCheck = await checkAuthLimit(ip);
    if (!limitCheck.allowed) {
      return NextResponse.redirect(`${BASE_URL}/login?error=rate_limited`);
    }

    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');
    const errorDescription = req.nextUrl.searchParams.get('error_description');

    // Which flow is this? The connect flow's own state cookie only exists while one of
    // its authorize redirects is in flight, so its presence (matching this state) is
    // enough to tell it apart from an ordinary sign-in.
    const connectStateCookie = req.cookies.get('connect_line_state')?.value;
    const isConnectFlow = !!connectStateCookie && connectStateCookie === state;

    if (error) {
      console.error(`[line-callback] Error from LINE: ${error} - ${errorDescription}`);
      return NextResponse.redirect(isConnectFlow ? `${SETTINGS_ACCOUNT_URL}&linkError=${error}` : `${BASE_URL}/login?error=${error}`);
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state parameter' },
        { status: 400 }
      );
    }

    if (isConnectFlow) {
      return handleConnectCallback(req, code, state);
    }

    // Verify state CSRF token
    const cookieState = req.cookies.get('line_auth_state')?.value;
    if (!cookieState || cookieState !== state) {
      console.error('[line-callback] State mismatch (CSRF attack?)');
      return NextResponse.json(
        { error: 'State mismatch - possible CSRF attack' },
        { status: 403 }
      );
    }

    const redirectUri = `${BASE_URL}/api/auth/line/callback`;
    const cookieNonce = req.cookies.get('line_auth_nonce')?.value;
    if (!cookieNonce) {
      return NextResponse.redirect(`${BASE_URL}/login?error=line_auth_failed`);
    }

    const profile = await exchangeLineCode(code, redirectUri, cookieNonce);
    if (!profile) {
      return NextResponse.redirect(`${BASE_URL}/login?error=line_auth_failed`);
    }

    await dbConnect();

    // Find or create merchant with LINE user ID
    const lineUserId = profile.lineUserId;
    let merchant = await Merchant.findOne({ lineUserId });

    if (!merchant) {
      // Check for an existing email-based account before creating a new one —
      // never silently link a LINE identity onto someone else's account. Instead, hand off
      // to a short-lived link-confirmation flow that requires proving ownership of that
      // account with its password before anything gets attached to it.
      const normalizedEmail = profile.email ?? `${lineUserId}@line.local`;
      const existingByEmail = profile.email ? await Merchant.findOne({ email: normalizedEmail }) : null;
      if (existingByEmail) {
        console.warn(`[line-callback] Email collision for ${normalizedEmail} — routing to link confirmation`);
        const linkToken = signLineLinkToken({
          lineUserId,
          lineAccessToken: profile.accessToken,
          email: normalizedEmail,
        });
        const res = NextResponse.redirect(`${BASE_URL}/login/link-line`);
        res.cookies.set('line_link_pending', linkToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 10,
          path: '/',
        });
        res.cookies.set('line_auth_state', '', { maxAge: 0, path: '/' });
        res.cookies.set('line_auth_nonce', '', { maxAge: 0, path: '/' });
        return res;
      }

      // New merchant - create account
      const defaultShopName = profile.name || `Shop ${lineUserId.slice(-6)}`;
      const slug = await generateUniqueSlug(toSlug(defaultShopName));

      merchant = await Merchant.create({
        lineUserId,
        email: normalizedEmail,
        passwordHash: null, // No password for LINE OAuth users
        shopName: defaultShopName,
        slug,
        // Free by default — Pro trial is now an explicit opt-in that requires a card
        // (see /api/billing/start-trial), matching the email signup flow.
        tier: 'free',
        paymentStatus: 'paid',
        authMethod: 'line_oauth',
        lineAccessToken: profile.accessToken,
        acceptedTermsAt: new Date(),
        acceptedTermsVersion: CURRENT_TERMS_VERSION,
      });

      // Create default settings
      await Settings.create({
        merchantId: merchant._id,
        shopName: defaultShopName,
      });

      console.log(`[line-callback] New merchant created: ${merchant._id}`);
    } else {
      // Existing merchant - update access token and last login
      merchant.lineAccessToken = profile.accessToken;
      merchant.lastLoginAt = new Date();
      merchant.lastLoginMethod = 'line_oauth';
      const cancelled = clearInactivityDeletion(merchant);
      await merchant.save();
      if (cancelled) {
        await logAudit({ merchantId: merchant._id.toString(), action: 'inactivity_deletion_cancelled', resource: 'merchant', status: 'success' }, req);
      }
    }

    // Log successful login
    await logAudit({
      merchantId: merchant._id.toString(),
      action: 'login',
      resource: 'merchant',
      status: 'success',
    }, req);

    // Create JWT token
    const token = signMerchantToken({
      merchantId: merchant._id.toString(),
      email: merchant.email,
    });

    // Redirect to dashboard
    const res = NextResponse.redirect(`${BASE_URL}/dashboard`);

    // Set auth cookie
    res.cookies.set('merchant_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    // Clear auth state/nonce cookies
    res.cookies.set('line_auth_state', '', { maxAge: 0, path: '/' });
    res.cookies.set('line_auth_nonce', '', { maxAge: 0, path: '/' });

    return res;
  } catch (err) {
    console.error('[line-callback]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
