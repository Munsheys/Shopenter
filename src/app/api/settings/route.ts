import { NextRequest, NextResponse } from 'next/server';
import { SettingsRepo } from '@/lib/repos/settings';
import { MerchantRepo } from '@/lib/repos/merchant';
import { getMerchantFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { createLiffApp } from '@/lib/liffProvision';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await SettingsRepo.findOrCreate(merchant.merchantId);
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
  'broadcastReminder', 'orderPrefix', 'autoDeliver', 'loyalty', 'lineIntentSearch', 'telegram', 'instagram', 'storefront',
  'greetingNativeAckAt', 'autoReplyNativeAckAt',
];

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
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

    // Filter to allowed fields only (never allow merchant to assign tier/paymentStatus).
    // Nested telegram/instagram objects are passed through as-is — SettingsRepo.upsert
    // merges them against the existing stored object instead of overwriting it, same
    // effect as the old Mongoose dotted-path $set without needing DynamoDB path tricks.
    const update: Record<string, any> = {};
    for (const [key, val] of Object.entries(body)) {
      if (!ALLOWED_FIELDS.includes(key)) continue;
      if (['tier', 'paymentStatus', 'merchantId', 'id', 'createdAt'].includes(key)) continue;
      update[key] = val;
    }

    // Sync shopName and slug to the Merchant model as well, since they govern global identity and storefront routing
    if (body.shopName !== undefined || body.slug !== undefined) {
      const merchantUpdate: Record<string, any> = {};
      if (body.shopName !== undefined) merchantUpdate.shopName = body.shopName;
      if (body.slug !== undefined) {
        // Enforce lowercase alphanumeric with hyphens
        const cleanSlug = typeof body.slug === 'string' ? body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '') : '';
        merchantUpdate.slug = cleanSlug || null; // convert empty strings to null to avoid unique constraint errors on empty slugs
        update.slug = cleanSlug;
      }
      try {
        await MerchantRepo.update(merchant.merchantId, merchantUpdate);
      } catch (e) {
        // Ignore duplicate slug errors for now or handle them gracefully
      }
    }

    let settings = await SettingsRepo.upsert(merchant.merchantId, update);

    // Auto-provision a LIFF app the moment a Channel Access Token is saved without one
    // already configured — removes the manual "create a LIFF app, copy its ID back"
    // step, which previously blocked guest checkout on the storefront if skipped.
    if (update.lineChannelAccessToken && !settings.liffId) {
      const merchantDoc = await MerchantRepo.findById(merchant.merchantId);
      if (merchantDoc?.slug) {
        const endpointUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app'}/shop/${merchantDoc.slug}`;
        const liffId = await createLiffApp(settings.lineChannelAccessToken, endpointUrl);
        if (liffId) {
          settings = await SettingsRepo.upsert(merchant.merchantId, { liffId });
          await logAudit({ merchantId: merchant.merchantId, action: 'settings_change', resource: 'settings', changes: { after: { fieldsChanged: ['liffId (auto-provisioned)'] } }, status: 'success' }, req);
        }
      }
    }

    // Field names only — never log secret values (defeats the point of encrypting them at rest).
    await logAudit(
      { merchantId: merchant.merchantId, action: 'settings_change', resource: 'settings', changes: { after: { fieldsChanged: Object.keys(update) } }, status: 'success' },
      req
    );

    // Same as GET — never echo platform-level secrets back to the client.
    delete settings.lineChannelAccessToken;
    delete settings.lineChannelSecret;
    delete settings.adminSecret;
    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to update settings: ${err.message || 'Unknown error'}` }, { status: 400 });
  }
}
