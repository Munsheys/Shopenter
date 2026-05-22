import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const filter: any = { merchantId: merchant.merchantId };

  if (searchParams.get('customerId')) filter.lineUserId = searchParams.get('customerId');

  const statusParam = searchParams.get('status');
  if (statusParam) {
    const statuses = statusParam.split(',').map(s => s.trim());
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const search = searchParams.get('search');
  if (search) {
    filter.$or = [
      { displayName: { $regex: search, $options: 'i' } },
      { product: { $regex: search, $options: 'i' } },
      { tracking: { $regex: search, $options: 'i' } }
    ];
  }

  try {
    await dbConnect();
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const body = await req.json();
    const order = await Order.create({
      merchantId: merchant.merchantId,
      lineUserId: body.lineUserId,
      displayName: body.displayName,
      soldTHB: body.totalTHB,
      items: body.items,
      product: body.items?.map((i: any) => `${i.qty}x ${i.name}`).join(', '),
      status: 'pending',
      paymentQrSent: false
    });
    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
