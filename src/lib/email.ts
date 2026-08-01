/**
 * Thin wrapper around Resend's REST API, plain fetch (same pattern as omise.ts, no SDK
 * dependency needed). This is currently the ONLY place Shopenter sends email — used for
 * merchant password reset when the merchant hasn't linked LINE (see
 * src/lib/subscriptionNotify.ts and src/lib/shopenterLine.ts for the LINE-based equivalent
 * used everywhere else). No Resend account exists yet at the time this was written — like
 * SHOPENTER_LINE_CHANNEL_ACCESS_TOKEN before it, this no-ops and logs rather than throwing
 * when RESEND_API_KEY is unset, so the feature is inert (not broken) until it's configured.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'Shopenter <noreply@shopenter.app>';
  if (!apiKey) {
    console.error('[email] RESEND_API_KEY is not set — cannot send email');
    return false;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text }),
    });

    if (!res.ok) {
      console.error('[email] Send failed', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Send error', err);
    return false;
  }
}
