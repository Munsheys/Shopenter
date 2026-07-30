import jwt from 'jsonwebtoken';

interface LineIdToken {
  iss: string;
  sub: string;
  aud: string;
  nonce: string;
  exp: number;
  iat: number;
  auth_time: number;
  email?: string;
  name?: string;
  picture?: string;
}

export interface LineOAuthProfile {
  lineUserId: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  accessToken: string;
}

/**
 * Exchanges an authorization code for LINE's tokens and verifies the ID token (HS256,
 * signed with the channel secret). Shared by the sign-in callback and the
 * connect-line-to-existing-account callback — same LINE Login channel, same verification
 * rules, just different things happen afterward with the resulting profile.
 */
export async function exchangeLineCode(
  code: string,
  redirectUri: string,
  expectedNonce: string
): Promise<LineOAuthProfile | null> {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelId || !channelSecret) return null;

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
    console.error('[lineOAuth] Token exchange failed:', await tokenRes.text());
    return null;
  }

  const tokenData = (await tokenRes.json()) as { access_token: string; id_token: string };

  try {
    const verified = jwt.verify(tokenData.id_token, channelSecret, {
      algorithms: ['HS256'],
      audience: channelId,
      issuer: 'https://access.line.me',
    }) as LineIdToken;

    if (verified.nonce !== expectedNonce) {
      throw new Error('Nonce mismatch');
    }

    return {
      lineUserId: verified.sub,
      email: verified.email ? verified.email.toLowerCase().trim() : null,
      name: verified.name ?? null,
      picture: verified.picture ?? null,
      accessToken: tokenData.access_token,
    };
  } catch (err) {
    console.error('[lineOAuth] Failed to verify ID token:', err);
    return null;
  }
}
