import { NextRequest, NextResponse } from 'next/server';
import { OrderRepo } from '@/lib/repos/order';
import { FulfilmentRepo } from '@/lib/repos/fulfilment';
import { SettingsRepo } from '@/lib/repos/settings';
import { MerchantRepo } from '@/lib/repos/merchant';
import { getMerchantFromRequest } from '@/lib/auth';
import { checkCountLimit, type Tier } from '@/lib/tiers';
import { sendLineMessage } from '@/lib/platforms/line';
import { logAudit } from '@/lib/auditLog';
import { paginateInMemory, getPaginationParams } from '@/lib/pagination';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { page, limit } = getPaginationParams(searchParams);

    const all = await OrderRepo.listByMerchant(merchant.merchantId);
    const { data: orders, meta } = paginateInMemory(all, page, limit);

    // Attach fulfilment summary for the current page only
    const ordersWithSummary = await Promise.all(orders.map(async (o) => {
      const fulfilments = await FulfilmentRepo.listByOrder(o.id);
      const summary = fulfilments.length === 0 ? null : {
        total: fulfilments.length,
        shipped: fulfilments.filter((f) => f.status === 'shipped' || f.status === 'delivered').length,
        delivered: fulfilments.filter((f) => f.status === 'delivered').length,
      };
      return { ...o, fulfilmentSummary: summary };
    }));

    return NextResponse.json({ data: ordersWithSummary, pagination: meta });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const merchantDoc = await MerchantRepo.findById(merchant.merchantId);
    const tier = (merchantDoc?.tier ?? 'free') as Tier;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthCount = await OrderRepo.countThisMonth(merchant.merchantId, startOfMonth);
    const check = checkCountLimit(tier, 'ordersPerMonth', monthCount);
    if (!check.allowed) {
      return NextResponse.json(
        { error: 'TIER_LIMIT_REACHED', feature: 'ordersPerMonth', limit: check.limit, current: monthCount, requiredTier: 'pro' },
        { status: 403 }
      );
    }

    const body = await req.json();

    const settings = await SettingsRepo.findByMerchantId(merchant.merchantId);
    const costCurrency = (body.costCurrency || settings?.importCurrency || 'THB').toUpperCase();
    const soldCurrency = (settings?.localCurrency || 'THB').toUpperCase();
    const useAutoRate = settings?.useAutoRate ?? false;

    const costAmount: number = body.costKRW || 0;
    let rate: number = settings?.krwRate ?? 1;

    if (costAmount > 0 && useAutoRate) {
      try {
        const rateRes = await fetch(`https://open.er-api.com/v6/latest/${costCurrency}`, { cache: 'no-store' });
        const rateData = await rateRes.json();
        if (rateData.result === 'success' && rateData.rates?.[soldCurrency]) {
          rate = rateData.rates[soldCurrency];
        }
      } catch {
        // fall through to stored rate
      }
    }

    const costLocal = costAmount * rate;
    const soldLocal: number = body.soldTHB || 0;
    const shipCost: number = body.shipCostTHB || 0;
    const profit = costAmount > 0 ? soldLocal - costLocal - shipCost : 0;

    const order = await OrderRepo.create({
      ...body,
      merchantId: merchant.merchantId,
      status: body.status || 'pending',
      costCurrency,
      soldCurrency,
      costTHB: costAmount > 0 ? costLocal : (body.costTHB ?? 0),
      profit: costAmount > 0 ? profit : (body.profit ?? 0),
      rateUsed: costAmount > 0 ? rate : body.rateUsed,
    });

    // Push admin LINE alert if enabled
    if (settings?.adminAlerts?.newOrder && settings.adminLineId && settings.lineChannelAccessToken) {
      const prefix = settings.orderPrefix ? `${settings.orderPrefix}` : '';
      const shortId = order.id.slice(-6).toUpperCase();
      const productText = body.product || body.items?.map((i: any) => i.name).join(', ') || 'New item';
      const alertMsg = `🛍️ New order: ${prefix}${shortId}\n${productText}\n฿${body.soldTHB || 0}`;
      sendLineMessage(settings.lineChannelAccessToken, settings.adminLineId, alertMsg).catch(() => {});
    }

    await logAudit(
      { merchantId: merchant.merchantId, action: 'order_create', resource: 'order', resourceId: order.id, status: 'success' },
      req
    );

    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
