import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const channelId = process.env.LINE_CHANNEL_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app'}/api/auth/line/callback`;

    if (!channelId) {
      return NextResponse.json(
        { error: 'LINE_CHANNEL_ID is not configured' },
        { status: 500 }
      );
    }

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    // Store state in cookie (will be verified in callback)
    const res = NextResponse.redirect(
      `https://web.line.me/web/login?${new URLSearchParams({
        response_type: 'code',
        client_id: channelId,
        redirect_uri: redirectUri,
        state: state,
        scope: 'profile openid email',
        nonce: nonce,
      }).toString()}`
    );

    // Store state and nonce in secure httpOnly cookies
    res.cookies.set('line_auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/'
    });

    res.cookies.set('line_auth_nonce', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/'
    });

    return res;
  } catch (err) {
    console.error('[line-authorize]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
