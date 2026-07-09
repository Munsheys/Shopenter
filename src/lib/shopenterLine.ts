/**
 * Push wrapper for Shopenter's OWN LINE Official Account — used to notify merchants
 * about their account (e.g. upcoming inactivity deletion), independent of each
 * merchant's own Messaging API channel/token (which could itself be part of what's
 * at risk if their account is being cleaned up).
 *
 * This is a separate LINE channel from the LINE Login channel used for
 * sign-in (src/app/api/auth/line/callback) — reuses the same `lineUserId`
 * as the target, since a merchant only has one LINE identity, but requires
 * Shopenter's own Messaging API channel to have that user added as a friend
 * before a push will deliver. Merchants without a lineUserId (email-only
 * signups who never linked LINE) can't be reached this way — see the
 * inactivity-check cron for how that case is handled.
 */

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

export async function pushShopenterLineMessage(lineUserId: string, text: string): Promise<boolean> {
  const token = process.env.SHOPENTER_LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error('[shopenterLine] SHOPENTER_LINE_CHANNEL_ACCESS_TOKEN is not set — cannot send merchant notification');
    return false;
  }

  const res = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: 'text', text }],
    }),
  });

  if (!res.ok) {
    console.error('[shopenterLine] Push failed', res.status, await res.text());
    return false;
  }
  return true;
}
