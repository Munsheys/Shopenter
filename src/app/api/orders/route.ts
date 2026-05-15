import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Settings } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const orders = await Order.find({ merchantId: merchant.merchantId }).sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
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

    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
