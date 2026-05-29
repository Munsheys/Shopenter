import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Settings, Merchant, Fulfilment } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { checkCountLimit, type Tier } from '@/lib/tiers';
import { sendLineMessage } from '@/lib/platforms/line';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const orders = await Order.find({ merchantId: merchant.merchantId }).sort({ createdAt: -1 }).lean() as any[];

    // Attach fulfilment summary to each order in a single aggregation
    const fulSummary = await Fulfilment.aggregate([
      { $match: { orderId: { $in: orders.map((o: any) => o._id) } } },
      { $group: {
        _id: '$orderId',
        total: { $sum: 1 },
        shipped: { $sum: { $cond: [{ $in: ['$status', ['shipped', 'delivered']] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
      }},
    ]);

    const summaryMap = new Map(fulSummary.map((s: any) => [String(s._id), { total: s.total, shipped: s.shipped, delivered: s.delivered }]));
    const ordersWithSummary = orders.map((o: any) => ({
      ...o,
      fulfilmentSummary: summaryMap.get(String(o._id)) ?? null,
    }));

    return NextResponse.json(ordersWithSummary);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();

    const merchantDoc = await Merchant.findById(merchant.merchantId).select('tier').lean() as any;
    const tier = (merchantDoc?.tier ?? 'free') as Tier;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthCount = await Order.countDocuments({ merchantId: merchant.merchantId, createdAt: { $gte: startOfMonth } });
    const check = checkCountLimit(tier, 'ordersPerMonth', monthCount);
    if (!check.allowed) {
      return NextResponse.json(
        { error: 'TIER_LIMIT_REACHED', feature: 'ordersPerMonth', limit: check.limit, current: monthCount, requiredTier: 'pro' },
        { status: 403 }
      );
    }

    const body = await req.json();

    const settings = await Settings.findOne({ merchantId: merchant.merchantId });
    const costCurrency = (body.costCurrency || settings?.importCurrency || 'KRW').toUpperCase();
    const soldCurrency = (settings?.localCurrency || 'THB').toUpperCase();
    const useAutoRate = settings?.useAutoRate ?? false;

    const costAmount: number = body.costKRW || 0;
    let rate: number = settings?.krwRate ?? 0.026;

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

    const order = await Order.create({
      ...body,
      merchantId: merchant.merchantId,
      costCurrency,
      soldCurrency,
      costTHB: costAmount > 0 ? costLocal : (body.costTHB ?? 0),
      profit: costAmount > 0 ? profit : (body.profit ?? 0),
      rateUsed: costAmount > 0 ? rate : body.rateUsed,
    });

    // Push admin LINE alert if enabled
    if (settings?.adminAlerts?.newOrder && settings.adminLineId && settings.lineChannelAccessToken) {
      const prefix = settings.orderPrefix ? `${settings.orderPrefix}` : '';
      const shortId = order._id.toString().slice(-6).toUpperCase();
      const productText = body.product || body.items?.map((i: any) => i.name).join(', ') || 'New item';
      const alertMsg = `🛍️ New order: ${prefix}${shortId}\n${productText}\n฿${body.soldTHB || 0}`;
      sendLineMessage(settings.lineChannelAccessToken, settings.adminLineId, alertMsg).catch(() => {});
    }

    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
