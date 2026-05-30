export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Settings, Merchant } from '@/models';
import {
  sendTelegramMessage,
  sendTelegramPhotoWithKeyboard,
  sendTelegramInlineKeyboard,
} from '@/lib/platforms/telegram';
import { searchProducts } from '@/lib/intentSearch';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const { merchantId } = await params;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host  = req.headers.get('host') || '';
  const baseUrl = `${proto}://${host}`;

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

  if (!update.message) return;

  const msg    = update.message;
  const chatId = String(msg.chat?.id ?? '');
  if (!chatId) return;

  const firstName   = msg.from?.first_name || '';
  const lastName    = msg.from?.last_name  || '';
  const username    = msg.from?.username   || '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || chatId;

  await upsertCustomer(merchantId, chatId, firstName, lastName, username);

  const merchant = await Merchant.findById(merchantId).select('slug').lean() as any;
  const storePath = merchant?.slug
    ? `/shop/${merchant.slug}`
    : `/merchant/${merchantId}`;
  const identityParams = `uid=${chatId}&platform=telegram&name=${encodeURIComponent(firstName || displayName)}`;

  // Try to infer product intent from the message (if enabled)
  const userText = (msg.text ?? '').trim();
  const matches  = settings.telegram?.intentSearch !== false
    ? await searchProducts(merchantId, userText)
    : [];

  if (matches.length > 0) {
    await sendTelegramMessage(token, chatId, `Here's what I found 👇`);
    for (const product of matches) {
      const productUrl = `${baseUrl}${storePath}?${identityParams}&product=${product._id}`;
      const caption    =
        `<b>${product.name}</b>` +
        (product.brand ? `\n<i>${product.brand}</i>` : '') +
        `\n฿${(product.price as number).toLocaleString()}` +
        (product.description
          ? `\n${(product.description as string).slice(0, 120)}${(product.description as string).length > 120 ? '…' : ''}`
          : '');
      const buttons = [[{ text: `🛍️ View ${product.name}`, url: productUrl }]];

      if (product.imageUrl) {
        await sendTelegramPhotoWithKeyboard(token, chatId, product.imageUrl as string, caption, buttons);
      } else {
        await sendTelegramInlineKeyboard(token, chatId, caption, buttons);
      }
    }
    return;
  }

  // Fallback: send storefront entry link
  const shopUrl = `${baseUrl}${storePath}?${identityParams}`;
  const text    =
    `🛍️ <b>${shopName}</b>` +
    (tagline ? `\n<i>${tagline}</i>` : '') +
    `\n\nTap the button to browse and order. Your identity is saved automatically — no login needed! 🙌`;

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
