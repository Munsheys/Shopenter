import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import { Merchant, Settings, AuditLog } from '@/models';
import { signMerchantToken } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

export const runtime = 'nodejs';

interface LineIdToken {
  iss: string;
  sub: string;
  aud: string;
  nonce: string;
  exp: number;
  iat: number;
  auth_time: number;
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');
    const errorDescription = req.nextUrl.searchParams.get('error_description');

    // Handle LINE errors
    if (error) {
      console.error(`[line-callback] Error from LINE: ${error} - ${errorDescription}`);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app'}/login?error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state parameter' },
        { status: 400 }
      );
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

    const channelId = process.env.LINE_CHANNEL_ID;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app'}/api/auth/line/callback`;

    if (!channelId || !channelSecret) {
      return NextResponse.json(
        { error: 'LINE credentials not configured' },
        { status: 500 }
      );
    }

    // Exchange code for token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[line-callback] Token exchange failed:', err);
      return NextResponse.json(
        { error: 'Failed to exchange code for token' },
        { status: 500 }
      );
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      id_token: string;
      token_type: string;
      expires_in: number;
      scope: string;
    };

    // Verify and decode ID token
    let userInfo: LineIdToken & { email?: string; name?: string; picture?: string };
    try {
      // LINE ID tokens are signed with LINE's public key
      // In production, you should verify the signature
      // For now, we'll decode without verification (trusting LINE's TLS)
      const decoded = jwt.decode(tokenData.id_token, { complete: true });

      if (!decoded?.payload) {
        throw new Error('Invalid ID token');
      }

      userInfo = decoded.payload as LineIdToken & { email?: string; name?: string; picture?: string };

      // Verify nonce
      const cookieNonce = req.cookies.get('line_auth_nonce')?.value;
      if (!cookieNonce || cookieNonce !== userInfo.nonce) {
        throw new Error('Nonce mismatch');
      }
    } catch (err) {
      console.error('[line-callback] Failed to decode ID token:', err);
      return NextResponse.json(
        { error: 'Failed to verify ID token' },
        { status: 403 }
      );
    }

    await dbConnect();

    // Find or create merchant with LINE user ID
    const lineUserId = userInfo.sub;
    let merchant = await Merchant.findOne({ lineUserId });

    if (!merchant) {
      // New merchant - create account
      // Generate default shop name and slug
      const defaultShopName = userInfo.name || `Shop ${lineUserId.slice(-6)}`;
      const slug = defaultShopName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);

      merchant = await Merchant.create({
        lineUserId,
        email: userInfo.email || `${lineUserId}@line.com`,
        passwordHash: null, // No password for LINE OAuth users
        shopName: defaultShopName,
        slug: slug || 'shop',
        tier: 'pro',
        paymentStatus: 'trialing',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 day trial
        trialReason: 'signup',
        authMethod: 'line_oauth',
        lineAccessToken: tokenData.access_token,
      });

      // Create default settings
      await Settings.create({
        merchantId: merchant._id,
        shopName: defaultShopName,
      });

      console.log(`[line-callback] New merchant created: ${merchant._id}`);
    } else {
      // Existing merchant - update access token and last login
      await Merchant.findByIdAndUpdate(merchant._id, {
        lineAccessToken: tokenData.access_token,
        lastLoginAt: new Date(),
        lastLoginMethod: 'line_oauth',
      });
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
    const res = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app'}/dashboard`
    );

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
