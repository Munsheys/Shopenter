export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Product, Customer, Settings } from '@/models';
import { sendTelegramMessage, sendTelegramInlineKeyboard, answerCallbackQuery } from '@/lib/platforms/telegram';
import { notifyMerchant } from '@/lib/notifyMerchant';

// ── Session management (in-memory, per serverless instance) ────────────────────

interface TelegramSession {
  step: 'idle' | 'browsing' | 'cart' | 'checkout_name' | 'checkout_address';
  cart: Array<{ productId: string; name: string; variantLabel: string; price: number; qty: number; imageUrl?: string }>;
  checkoutName?: string;
}

const sessions = new Map<string, TelegramSession>();

function getSession(chatId: string): TelegramSession {
  if (!sessions.has(chatId)) sessions.set(chatId, { step: 'idle', cart: [] });
  return sessions.get(chatId)!;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  // Always return 200 immediately — Telegram retries non-200 responses
  const { merchantId } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Fire-and-forget processing so Telegram never times out waiting for us
  handleUpdate(merchantId, body).catch(err => console.error('[telegram webhook]', err));

  return NextResponse.json({ ok: true });
}

async function handleUpdate(merchantId: string, update: any) {
  await dbConnect();

  const settings = await Settings.findOne({ merchantId }).lean() as any;
  if (!settings?.telegram?.botToken) return;

  const token: string = settings.telegram.botToken;
  const shopName: string = settings.shopName || 'Our Shop';
  const shopTagline: string = settings.storefront?.shopTagline || '';

  // ── callback_query (inline button tap) ──────────────────────────────────────
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = String(cq.message?.chat?.id ?? cq.from?.id ?? '');
    if (!chatId) return;

    await answerCallbackQuery(token, cq.id);

    const data: string = cq.data ?? '';

    if (data.startsWith('add:')) {
      const productId = data.slice(4);
      const product = await Product.findOne({ _id: productId, merchantId, isActive: true }).lean() as any;
      if (!product) {
        await sendTelegramMessage(token, chatId, 'Sorry, that product is no longer available.');
        return;
      }

      const session = getSession(chatId);
      const existing = session.cart.find(i => i.productId === productId);
      if (existing) {
        existing.qty += 1;
      } else {
        session.cart.push({
          productId: String(product._id),
          name: product.name,
          variantLabel: '',
          price: product.price,
          qty: 1,
          imageUrl: product.imageUrl,
        });
      }

      await sendTelegramMessage(token, chatId, `Added <b>${product.name}</b> to cart! 🛒\n\nUse /cart to view your cart or /products to keep browsing.`);

      // Upsert customer record on interaction
      await upsertCustomer(merchantId, chatId, cq.from?.first_name, cq.from?.last_name, cq.from?.username);
    }

    if (data === 'checkout') {
      await startCheckout(token, chatId, merchantId, cq.from?.first_name, cq.from?.last_name, cq.from?.username);
    }

    return;
  }

  // ── message ──────────────────────────────────────────────────────────────────
  if (!update.message) return;

  const msg = update.message;
  const chatId = String(msg.chat?.id ?? '');
  if (!chatId) return;

  const text: string = (msg.text ?? '').trim();
  const session = getSession(chatId);

  // Upsert customer on each message
  await upsertCustomer(merchantId, chatId, msg.from?.first_name, msg.from?.last_name, msg.from?.username);

  // ── Checkout flow (text input steps) ──────────────────────────────────────
  if (session.step === 'checkout_name') {
    session.checkoutName = text;
    session.step = 'checkout_address';
    await sendTelegramMessage(token, chatId, 'Thanks! Now please enter your <b>delivery address</b>:');
    return;
  }

  if (session.step === 'checkout_address') {
    const address = text;
    const total = session.cart.reduce((s, i) => s + i.price * i.qty, 0);
    const itemsSummary = session.cart.map(i => `• ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.qty} — ฿${(i.price * i.qty).toLocaleString()}`).join('\n');

    try {
      await Order.create({
        merchantId,
        userId: chatId,
        platform: 'telegram',
        displayName: session.checkoutName,
        address,
        items: session.cart.map(i => ({ ...i })),
        soldTHB: total,
        status: 'pending',
      });

      const confirmMsg =
        `✅ <b>Order placed!</b>\n\n` +
        `${itemsSummary}\n\n` +
        `<b>Total:</b> ฿${total.toLocaleString()}\n` +
        `<b>Name:</b> ${session.checkoutName}\n` +
        `<b>Address:</b> ${address}\n\n` +
        `We'll process your order shortly. Thank you! 🙏`;

      await sendTelegramMessage(token, chatId, confirmMsg);

      // Notify merchant
      await notifyMerchant({
        merchantId,
        type: 'new_order',
        message:
          `🛒 New Telegram order!\n\nCustomer: ${session.checkoutName} (${chatId})\nItems: ${session.cart.map(i => `${i.name} x${i.qty}`).join(', ')}\nTotal: ฿${total.toLocaleString()}`,
        metadata: { userId: chatId, platform: 'telegram', total },
        settings,
      });

      // Reset session
      sessions.set(chatId, { step: 'idle', cart: [] });
    } catch (err) {
      console.error('[telegram checkout]', err);
      await sendTelegramMessage(token, chatId, 'Sorry, there was an error placing your order. Please try again.');
    }
    return;
  }

  // ── Commands ──────────────────────────────────────────────────────────────
  if (text.startsWith('/start')) {
    const welcome =
      `Welcome to <b>${shopName}</b>! 🛍️` +
      (shopTagline ? `\n<i>${shopTagline}</i>` : '') +
      `\n\nCommands:\n/products — Browse products\n/cart — View your cart\n/checkout — Place your order\n/help — Help`;
    await sendTelegramMessage(token, chatId, welcome);
    return;
  }

  if (text.startsWith('/help')) {
    await sendTelegramMessage(
      token, chatId,
      `<b>Help</b>\n\n/products — Browse all products\n/cart — View items in your cart\n/checkout — Start the checkout process\n/start — Show the welcome message`
    );
    return;
  }

  if (text.startsWith('/products')) {
    const products = await Product.find({ merchantId, isActive: true }).limit(20).lean() as any[];
    if (!products.length) {
      await sendTelegramMessage(token, chatId, 'No products available right now. Check back soon!');
      return;
    }
    session.step = 'browsing';
    for (const p of products) {
      const caption = `<b>${p.name}</b>\n฿${p.price.toLocaleString()}${p.description ? `\n${p.description}` : ''}`;
      await sendTelegramInlineKeyboard(token, chatId, caption, [[{ text: '🛒 Add to Cart', callback_data: `add:${p._id}` }]]);
    }
    return;
  }

  if (text.startsWith('/cart')) {
    if (!session.cart.length) {
      await sendTelegramMessage(token, chatId, 'Your cart is empty. Use /products to browse.');
      return;
    }
    const lines = session.cart.map(i => `• ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} x${i.qty} — ฿${(i.price * i.qty).toLocaleString()}`);
    const total = session.cart.reduce((s, i) => s + i.price * i.qty, 0);
    const cartText = `<b>Your Cart</b>\n\n${lines.join('\n')}\n\n<b>Total: ฿${total.toLocaleString()}</b>`;
    await sendTelegramInlineKeyboard(token, chatId, cartText, [[{ text: '✅ Checkout', callback_data: 'checkout' }]]);
    return;
  }

  if (text.startsWith('/checkout')) {
    await startCheckout(token, chatId, merchantId, msg.from?.first_name, msg.from?.last_name, msg.from?.username);
    return;
  }

  // Unrecognised message — show hint
  await sendTelegramMessage(token, chatId, `Use /products to browse, /cart to view your cart, or /checkout to order.`);
}

async function startCheckout(
  token: string,
  chatId: string,
  merchantId: string,
  firstName?: string,
  lastName?: string,
  username?: string
) {
  const session = getSession(chatId);
  if (!session.cart.length) {
    await sendTelegramMessage(token, chatId, 'Your cart is empty! Use /products to browse and add items first.');
    return;
  }
  await upsertCustomer(merchantId, chatId, firstName, lastName, username);
  session.step = 'checkout_name';
  await sendTelegramMessage(token, chatId, `Great! Let's complete your order.\n\nWhat's your <b>name</b> for delivery?`);
}

async function upsertCustomer(
  merchantId: string,
  chatId: string,
  firstName?: string,
  lastName?: string,
  username?: string
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
