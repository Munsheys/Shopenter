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

  const { isNew, isReEngage } = await upsertCustomer(merchantId, chatId, firstName, lastName, username);

  const merchant = await Merchant.findById(merchantId).select('slug').lean() as any;
  const storePath = merchant?.slug
    ? `/shop/${merchant.slug}`
    : `/merchant/${merchantId}`;
  const identityParams = `uid=${chatId}&platform=telegram&name=${encodeURIComponent(firstName || displayName)}`;

  // Send welcome message on first contact
  if (isNew && settings.telegram?.welcomeEnabled !== false) {
    const useCustomWelcome = settings.telegram?.welcomeCustom === true ||
      (settings.telegram?.welcomeCustom == null && !!settings.telegram?.welcomeMessage?.trim());
    const welcomeText = useCustomWelcome
      ? (settings.telegram?.welcomeMessage?.trim() || `Welcome to ${shopName}! 🎉`)
      : (settings.defaultWelcomeMessage?.trim() || `Welcome to ${shopName}! 🎉`);
    const useStorefrontLink = useCustomWelcome
      ? settings.telegram?.welcomeStorefrontLink !== false
      : settings.defaultWelcomeStorefrontLink !== false;
    if (useStorefrontLink) {
      const shopUrl = `${baseUrl}${storePath}?${identityParams}`;
      await sendTelegramInlineKeyboard(token, chatId, welcomeText, [[
        { text: `🛒 Browse ${shopName}`, url: shopUrl },
      ]]);
    } else {
      await sendTelegramMessage(token, chatId, welcomeText);
    }
    return;
  }

  // Re-engagement message after 24h absence
  if (isReEngage && settings.telegram?.reEngageEnabled) {
    const useCustomReEngage = settings.telegram?.reEngageCustom === true ||
      (settings.telegram?.reEngageCustom == null && !!settings.telegram?.reEngageMessage?.trim());
    const reEngageText = useCustomReEngage
      ? (settings.telegram?.reEngageMessage?.trim() || `Welcome back to ${shopName}! 👋 We've missed you.`)
      : (settings.defaultReEngageMessage?.trim() || `Welcome back to ${shopName}! 👋 We've missed you.`);
    const useStorefrontLink = useCustomReEngage
      ? settings.telegram?.reEngageStorefrontLink !== false
      : settings.defaultReEngageStorefrontLink !== false;
    if (useStorefrontLink) {
      const shopUrl = `${baseUrl}${storePath}?${identityParams}`;
      await sendTelegramInlineKeyboard(token, chatId, reEngageText, [[
        { text: `🛒 Browse ${shopName}`, url: shopUrl },
      ]]);
    } else {
      await sendTelegramMessage(token, chatId, reEngageText);
    }
    return;
  }

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
): Promise<{ isNew: boolean; isReEngage: boolean }> {
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || chatId;
  try {
    const before = await Customer.findOne({ merchantId, userId: chatId }).select('lastSeen').lean() as any;
    const result = await Customer.updateOne(
      { merchantId, userId: chatId },
      {
        $set: { displayName, platform: 'telegram', lastSeen: new Date() },
        $setOnInsert: { merchantId, userId: chatId, platform: 'telegram', createdAt: new Date() },
      },
      { upsert: true }
    );
    const isNew = result.upsertedCount > 0;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const isReEngage = !isNew && !!before?.lastSeen && new Date(before.lastSeen) < twentyFourHoursAgo;
    return { isNew, isReEngage };
  } catch (err) {
    console.error('[telegram upsertCustomer]', err);
    return { isNew: false, isReEngage: false };
  }
}
