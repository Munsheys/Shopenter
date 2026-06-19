import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    let s = await Settings.findOne({ merchantId: merchant.merchantId });
    if (!s) {
      s = await Settings.create({ merchantId: merchant.merchantId });
    }
    const settings = s.toObject();
    // Strip platform-level secrets — clients never see raw LINE credentials
    delete settings.lineChannelAccessToken;
    delete settings.lineChannelSecret;
    delete settings.adminSecret;
    // slipokApiKey and slipokBranchId are the merchant's own credentials — expose them for editing
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

const ALLOWED_FIELDS = [
  'shopName', 'theme', 'dashboardAccent', 'dashboardAccentGradient', 'dashboardCustomSolids', 'dashboardCustomGradients',
  'krwRate', 'importCurrency', 'localCurrency', 'useAutoRate', 'trackingTemplate', 'senderAddress',
  'shippingCompanies', 'lineChannelAccessToken', 'lineChannelSecret', 'liffId', 'adminLineId', 'adminSecret',
  'promptPayId', 'paymentTemplate', 'slipokBranchId', 'slipokApiKey', 'lineOAPlan', 'dashboardLanguage',
  'orderNotifications', 'shopDescription', 'shopTimezone', 'shopLogoUrl', 'compactMode', 'businessHours',
  'defaultWelcomeMessage', 'defaultWelcomeStorefrontLink', 'defaultReEngageMessage', 'defaultReEngageStorefrontLink',
  'greetingEnabled', 'greetingMessages', 'greetingCustom', 'reEngageEnabled', 'reEngageMessages', 'reEngageCustom',
  'richMenuSavedId', 'paymentMethods', 'bankAccounts', 'autoCancelHours', 'useSlipok', 'shippingPayer',
  'defaultShippingCost', 'freeShippingThreshold', 'codSurcharge', 'deliveryEstimates', 'adminAlerts',
  'broadcastReminder', 'orderPrefix', 'autoDeliver', 'loyalty', 'lineIntentSearch', 'telegram', 'instagram'
];

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const body = await req.json();

    // Sanitize LINE credential strings
    if (typeof body.lineChannelSecret === 'string') body.lineChannelSecret = body.lineChannelSecret.trim();
    if (typeof body.lineChannelAccessToken === 'string') body.lineChannelAccessToken = body.lineChannelAccessToken.trim();
    if (typeof body.liffId === 'string') body.liffId = body.liffId.trim();

    // Never overwrite credentials with empty strings
    if (!body.lineChannelAccessToken) delete body.lineChannelAccessToken;
    if (!body.lineChannelSecret) delete body.lineChannelSecret;
    // SlipOK credentials are merchant-owned — allow saving, but skip blank values to preserve existing
    if (typeof body.slipokApiKey === 'string' && !body.slipokApiKey.trim()) delete body.slipokApiKey;
    if (typeof body.slipokBranchId === 'string' && !body.slipokBranchId.trim()) delete body.slipokBranchId;

    // Allow adminSecret to be updated — it's a passphrase for bot commands, not a platform credential.
    // Treat it like other credential fields: skip save if blank (keeps existing value).
    if (typeof body.adminSecret === 'string' && !body.adminSecret.trim()) delete body.adminSecret;
    // Telegram bot token: skip blank to preserve existing value
    if (body.telegram && typeof body.telegram.botToken === 'string' && !body.telegram.botToken.trim()) {
      delete body.telegram.botToken;
    }
    // Instagram credentials: skip blank to preserve existing values
    if (body.instagram) {
      if (typeof body.instagram.pageAccessToken === 'string' && !body.instagram.pageAccessToken.trim()) {
        delete body.instagram.pageAccessToken;
      }
      if (typeof body.instagram.igAccountId === 'string' && !body.instagram.igAccountId.trim()) {
        delete body.instagram.igAccountId;
      }
    }

    // Build flat $set — convert nested telegram/instagram to dotted keys to avoid
    // MongoDB "path conflict" errors when mixing nested objects with dotted paths
    // Also filter to allowed fields only (never allow merchant to assign tier/paymentStatus)
    const update: Record<string, any> = {};
    for (const [key, val] of Object.entries(body)) {
      if (!ALLOWED_FIELDS.includes(key)) continue; // Skip disallowed fields
      if (['tier', 'paymentStatus', 'merchantId', '_id', '__v', 'createdAt'].includes(key)) continue;
      if (key === 'telegram' && val && typeof val === 'object' && !Array.isArray(val)) {
        for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
          if (subVal !== undefined) update[`telegram.${subKey}`] = subVal;
        }
      } else if (key === 'instagram' && val && typeof val === 'object' && !Array.isArray(val)) {
        for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
          if (subVal !== undefined) update[`instagram.${subKey}`] = subVal;
        }
      } else {
        update[key] = val;
      }
    }

    // Sync shopName and slug to the Merchant model as well, since they govern global identity and storefront routing
    if (body.shopName !== undefined || body.slug !== undefined) {
      const merchantUpdate: any = {};
      if (body.shopName !== undefined) merchantUpdate.shopName = body.shopName;
      if (body.slug !== undefined) {
        // Enforce lowercase alphanumeric with hyphens
        const cleanSlug = typeof body.slug === 'string' ? body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '') : '';
        merchantUpdate.slug = cleanSlug || null; // convert empty strings to null to avoid unique constraint errors on empty slugs
        update.slug = cleanSlug;
      }
      try {
        const { Merchant } = require('@/models');
        await Merchant.findByIdAndUpdate(merchant.merchantId, { $set: merchantUpdate });
      } catch (e) {
        // Ignore duplicate slug errors for now or handle them gracefully
      }
    }

    const s = await Settings.findOneAndUpdate(
      { merchantId: merchant.merchantId },
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    );
    return NextResponse.json(s);
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to update settings: ${err.message || 'Unknown error'}` }, { status: 400 });
  }
}
