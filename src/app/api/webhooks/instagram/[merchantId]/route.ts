export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import { Customer, Settings, Merchant } from '@/models';
import { searchProducts } from '@/lib/intentSearch';
import { sendInstagramMessage, sendInstagramProductCards } from '@/lib/platforms/instagram';

// Verify token merchants set in their Meta App webhook config
const VERIFY_TOKEN = process.env.IG_VERIFY_TOKEN || 'shopenter';
// Meta App Secret — used to verify the X-Hub-Signature-256 HMAC on each event.
const APP_SECRET = process.env.IG_APP_SECRET || '';

// Constant-time check of Meta's signature against one computed from the raw body.
function verifyInstagramSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!APP_SECRET) return true; // not configured — skip verification (backward compat)
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(rawBody).digest('hex');
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Webhook verification (Meta sends a GET to confirm the endpoint) ────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ── Webhook events (Meta sends a POST for each DM) ─────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const { merchantId } = await params;

  // Read the raw body first — HMAC must be computed over the exact bytes Meta sent.
  const rawBody = await req.text();
  if (!verifyInstagramSignature(rawBody, req.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  let body: any;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: true }); }

  const proto  = req.headers.get('x-forwarded-proto') || 'https';
  const host   = req.headers.get('host') || '';
  const baseUrl = `${proto}://${host}`;

  handleUpdate(merchantId, body, baseUrl).catch(err => console.error('[instagram webhook]', err));
  return NextResponse.json({ ok: true });
}

async function handleUpdate(merchantId: string, body: any, baseUrl: string) {
  await dbConnect();

  const settings = await Settings.findOne({ merchantId }).lean() as any;
  if (!settings?.instagram?.pageAccessToken) return;

  const token: string   = settings.instagram.pageAccessToken;
  const shopName: string = settings.shopName || 'Our Shop';

  // Meta wraps events in an "entry" array
  const entries: any[] = body.entry || [];
  for (const entry of entries) {
    const messages: any[] = entry.messaging || [];
    for (const event of messages) {
      const senderId: string = event.sender?.id;
      if (!senderId) continue;
      if (!event.message?.text) continue;

      const text = (event.message.text as string).trim();

      const { isNew, isReEngage } = await upsertCustomer(merchantId, senderId);

      const merchant   = await Merchant.findById(merchantId).select('slug').lean() as any;
      const storePath  = merchant?.slug ? `/shop/${merchant.slug}` : `/merchant/${merchantId}`;
      const identityParams = `uid=${senderId}&platform=instagram`;

      // Send welcome message on first contact
      if (isNew && settings.instagram?.welcomeEnabled !== false) {
        const useCustomWelcome = settings.instagram?.welcomeCustom === true ||
          (settings.instagram?.welcomeCustom == null && !!settings.instagram?.welcomeMessage?.trim());
        const welcomeText = useCustomWelcome
          ? (settings.instagram?.welcomeMessage?.trim() || `Welcome to ${shopName}! 🛍️`)
          : (settings.defaultWelcomeMessage?.trim() || `Welcome to ${shopName}! 🛍️`);
        const useStorefrontLink = useCustomWelcome
          ? settings.instagram?.welcomeStorefrontLink !== false
          : settings.defaultWelcomeStorefrontLink !== false;
        const shopUrl = `${baseUrl}${storePath}?${identityParams}`;
        const msg = useStorefrontLink
          ? `${welcomeText}\n\nBrowse and order here:\n${shopUrl}`
          : welcomeText;
        await sendInstagramMessage(token, senderId, msg);
        continue;
      }

      // Re-engagement message after 24h absence
      if (isReEngage && settings.instagram?.reEngageEnabled) {
        const useCustomReEngage = settings.instagram?.reEngageCustom === true ||
          (settings.instagram?.reEngageCustom == null && !!settings.instagram?.reEngageMessage?.trim());
        const reEngageText = useCustomReEngage
          ? (settings.instagram?.reEngageMessage?.trim() || `Welcome back to ${shopName}! 👋 We've missed you.`)
          : (settings.defaultReEngageMessage?.trim() || `Welcome back to ${shopName}! 👋 We've missed you.`);
        const useStorefrontLink = useCustomReEngage
          ? settings.instagram?.reEngageStorefrontLink !== false
          : settings.defaultReEngageStorefrontLink !== false;
        const shopUrl = `${baseUrl}${storePath}?${identityParams}`;
        const msg = useStorefrontLink
          ? `${reEngageText}\n\nBrowse and order here:\n${shopUrl}`
          : reEngageText;
        await sendInstagramMessage(token, senderId, msg);
        continue;
      }

      if (settings.instagram?.intentSearch !== false) {
        const matches = await searchProducts(merchantId, text);
        if (matches.length > 0) {
          const cards = matches.map((p: any) => ({
            name: p.name as string,
            brand: p.brand as string | undefined,
            price: p.price as number,
            imageUrl: p.imageUrl as string | undefined,
            productUrl: `${baseUrl}${storePath}?${identityParams}&product=${p._id}`,
          }));
          await sendInstagramProductCards(token, senderId, cards);
          continue;
        }
      }

      // Fallback: storefront link as text (Instagram doesn't support URL buttons natively without template)
      const shopUrl = `${baseUrl}${storePath}?${identityParams}`;
      await sendInstagramMessage(
        token,
        senderId,
        `Hi! Welcome to ${shopName} 🛍️\nTap here to browse and order — your identity is saved automatically:\n${shopUrl}`,
      );
    }
  }
}

async function upsertCustomer(merchantId: string, userId: string): Promise<{ isNew: boolean; isReEngage: boolean }> {
  try {
    const before = await Customer.findOne({ merchantId, userId }).select('lastSeen').lean() as any;
    const result = await Customer.updateOne(
      { merchantId, userId },
      {
        $set: { platform: 'instagram', lastSeen: new Date() },
        $setOnInsert: { merchantId, userId, platform: 'instagram', createdAt: new Date() },
      },
      { upsert: true }
    );
    const isNew = result.upsertedCount > 0;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const isReEngage = !isNew && !!before?.lastSeen && new Date(before.lastSeen) < twentyFourHoursAgo;
    return { isNew, isReEngage };
  } catch (err) {
    console.error('[instagram upsertCustomer]', err);
    return { isNew: false, isReEngage: false };
  }
}
