import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, Settings, Product, Customer, Order } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { checkApiLimit } from '@/lib/rateLimiter';
import { toCsv } from '@/lib/csv';

export const runtime = 'nodejs';

const VALID_RESOURCES = ['products', 'customers', 'orders'] as const;
type ExportResource = (typeof VALID_RESOURCES)[number];

/**
 * GET /api/merchant/export
 * Data portability endpoint (GDPR/Thai PDPA "right to data portability", and the
 * "export your data anytime, free, JSON or CSV" promise in the Merchant Agreement).
 * Deliberately NOT tier-gated — data portability is a compliance right, not a
 * paid feature (unlike the separate "csvExport" Pro-tier reporting feature).
 *
 * Query params:
 *   format=json (default) | csv
 *   resource=products|customers|orders (csv only; omit for a combined multi-section CSV)
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

  const format = req.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'json';
  const resourceParam = req.nextUrl.searchParams.get('resource');
  if (resourceParam && !VALID_RESOURCES.includes(resourceParam as ExportResource)) {
    return NextResponse.json({ error: `resource must be one of: ${VALID_RESOURCES.join(', ')}` }, { status: 400 });
  }
  const resource = resourceParam as ExportResource | null;

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

    await logAudit(
      { merchantId: merchant.merchantId, action: 'data_export', resource: 'merchant', status: 'success' },
      req
    );

    const dateStamp = new Date().toISOString().slice(0, 10);
    const slugOrId = merchantDoc.slug || merchant.merchantId;

    if (format === 'csv') {
      const datasets: Record<ExportResource, any[]> = { products, customers, orders };
      let body: string;
      let filename: string;

      if (resource) {
        body = toCsv(datasets[resource]);
        filename = `shopenter-export-${slugOrId}-${resource}-${dateStamp}.csv`;
      } else {
        body = (['products', 'customers', 'orders'] as ExportResource[])
          .map(key => `### ${key.toUpperCase()}\n${toCsv(datasets[key]) || '(no records)'}`)
          .join('\n\n');
        filename = `shopenter-export-${slugOrId}-${dateStamp}.csv`;
      }

      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      merchant: merchantDoc,
      settings: settingsDoc || null,
      products,
      customers,
      orders,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="shopenter-export-${slugOrId}-${dateStamp}.json"`,
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
