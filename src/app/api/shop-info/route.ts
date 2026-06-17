import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';
import { getLocalSettings } from '@/lib/storage';
import { resolveStoreMerchantId } from '@/lib/storeScope';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    // Scope to a specific merchant — a bare findOne() leaks an arbitrary
    // tenant's shop name / LIFF ID once more than one merchant exists.
    const merchantId = await resolveStoreMerchantId(req.nextUrl.searchParams.get('merchantId'));
    const settings = merchantId ? await Settings.findOne({ merchantId }) : null;
    if (!settings || !settings.adminSecret) {
      const local = getLocalSettings();
      return NextResponse.json({
        name: local.shopName,
        liffId: null, // Forces Setup Wizard
        adminLineId: null,
        branding: { theme: local.theme || 'light' }
      });
    }
    return NextResponse.json({
      merchantId: String(settings.merchantId),
      name: settings.shopName || "Auto-Market",
      liffId: settings.liffId || process.env.NEXT_PUBLIC_LIFF_ID || process.env.LIFF_ID,
      adminLineId: settings.adminLineId || process.env.NEXT_PUBLIC_ADMIN_LINE_ID,
      krwRate: settings.krwRate ?? 0.026,
      branding: { theme: settings.theme || 'light' },
      shipping: {
        payer: settings.shippingPayer || 'merchant',
        defaultCost: settings.defaultShippingCost || 0,
        freeThreshold: {
          enabled: settings.freeShippingThreshold?.enabled ?? false,
          amount: settings.freeShippingThreshold?.amount ?? 0,
        },
      },
    });
  } catch (error) {
    const local = getLocalSettings();
    return NextResponse.json({
      name: local.shopName,
      liffId: null,
      adminLineId: null,
      branding: { theme: local.theme || 'light' }
    });
  }
}
