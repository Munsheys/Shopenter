import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, Settings, Product, Customer, Order } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { checkApiLimit } from '@/lib/rateLimiter';

export const runtime = 'nodejs';

/**
 * GET /api/merchant/export
 * Data portability endpoint (GDPR/Thai PDPA "right to data portability", and the
 * "export your data anytime, free, JSON/CSV" promise in the Merchant Agreement).
 * Returns products, customers, and orders scoped to the authenticated merchant.
 */
export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limitCheck = await checkApiLimit(merchant.merchantId);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', retryAfter: limitCheck.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limitCheck.retryAfter) } }
    );
  }

  try {
    await dbConnect();

    const merchantDoc = await Merchant.findById(merchant.merchantId)
      .select('-passwordHash -lineAccessToken')
      .lean() as any;
    if (!merchantDoc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const settingsDoc = await Settings.findOne({ merchantId: merchant.merchantId }).lean() as any;
    if (settingsDoc) {
      delete settingsDoc.lineChannelAccessToken;
      delete settingsDoc.lineChannelSecret;
      delete settingsDoc.adminSecret;
      delete settingsDoc.slipokApiKey;
      if (settingsDoc.telegram) delete settingsDoc.telegram.botToken;
      if (settingsDoc.instagram) delete settingsDoc.instagram.pageAccessToken;
    }

    const [products, customers, orders] = await Promise.all([
      Product.find({ merchantId: merchant.merchantId }).lean(),
      Customer.find({ merchantId: merchant.merchantId }).lean(),
      Order.find({ merchantId: merchant.merchantId }).lean(),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      merchant: merchantDoc,
      settings: settingsDoc || null,
      products,
      customers,
      orders,
    };

    await logAudit(
      { merchantId: merchant.merchantId, action: 'data_export', resource: 'merchant', status: 'success' },
      req
    );

    const filename = `shopenter-export-${(merchantDoc.slug || merchant.merchantId)}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[merchant export]', error);
    await logAudit(
      { merchantId: merchant.merchantId, action: 'data_export', resource: 'merchant', status: 'failed', errorMessage: error instanceof Error ? error.message : 'Unknown error' },
      req
    );
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
