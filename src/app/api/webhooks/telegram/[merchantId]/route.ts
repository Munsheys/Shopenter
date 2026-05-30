export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Settings, Merchant } from '@/models';
import { sendTelegramInlineKeyboard } from '@/lib/platforms/telegram';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const { merchantId } = await params;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  // Derive base URL from the incoming request so it works in any environment
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host  = req.headers.get('host') || '';
  const baseUrl = `${proto}://${host}`;

  // Fire-and-forget — Telegram retries non-200 responses
  handleUpdate(merchantId, body, baseUrl).catch(err => console.error('[telegram webhook]', err));
  return NextResponse.json({ ok: true });
}

async function handleUpdate(merchantId: string, update: any, baseUrl: string) {
  await dbConnect();

  const settings = await Settings.findOne({ merchantId }).lean() as any;
  if (!settings?.telegram?.botToken) return;

  const token: string = settings.telegram.botToken;
  const shopName: string = settings.shopName || 'Our Shop';
  const tagline: string  = settings.storefront?.shopTagline || '';

  // ── Only handle regular messages ───────────────────────────────────────────
  if (!update.message) return;

  const msg    = update.message;
  const chatId = String(msg.chat?.id ?? '');
  if (!chatId) return;

  const firstName  = msg.from?.first_name || '';
  const lastName   = msg.from?.last_name  || '';
  const username   = msg.from?.username   || '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || chatId;

  // Upsert customer so they appear in the dashboard
  await upsertCustomer(merchantId, chatId, firstName, lastName, username);

  // Build the storefront URL with the customer's Telegram identity embedded
  const merchant = await Merchant.findById(merchantId).select('slug').lean() as any;
  const storePath = merchant?.slug
    ? `/shop/${merchant.slug}`
    : `/merchant/${merchantId}`;
  const shopUrl = `${baseUrl}${storePath}?uid=${chatId}&platform=telegram&name=${encodeURIComponent(firstName || displayName)}`;

  // Send a single message with a button that opens the storefront
  const text = `🛍️ <b>${shopName}</b>` +
    (tagline ? `\n<i>${tagline}</i>` : '') +
    `\n\nTap the button below to browse and order. Your identity is saved automatically — no login needed! 🙌`;

  await sendTelegramInlineKeyboard(token, chatId, text, [[
    { text: `🛒 Open ${shopName}`, url: shopUrl },
  ]]);
}

async function upsertCustomer(
  merchantId: string,
  chatId: string,
  firstName?: string,
  lastName?: string,
  username?: string,
) {
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || chatId;
  try {
    await Customer.findOneAndUpdate(
      { merchantId, userId: chatId },
      {
        $set: { displayName, platform: 'telegram', lastSeen: new Date() },
        $setOnInsert: { merchantId, userId: chatId, platform: 'telegram', createdAt: new Date() },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('[telegram upsertCustomer]', err);
  }
}
