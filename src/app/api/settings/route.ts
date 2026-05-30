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
    // Never let clients overwrite the merchantId binding
    delete body.merchantId;

    // Sync shopName and slug to the Merchant model as well, since they govern global identity and storefront routing
    if (body.shopName !== undefined || body.slug !== undefined) {
      const merchantUpdate: any = {};
      if (body.shopName !== undefined) merchantUpdate.shopName = body.shopName;
      if (body.slug !== undefined) {
        // Enforce lowercase alphanumeric with hyphens
        const cleanSlug = typeof body.slug === 'string' ? body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '') : '';
        merchantUpdate.slug = cleanSlug || null; // convert empty strings to null to avoid unique constraint errors on empty slugs
        body.slug = cleanSlug;
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
      { $set: body },
      { upsert: true, new: true }
    );
    return NextResponse.json(s);
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
