import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Fulfilment } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { recomputeOrderStatus } from '@/lib/recomputeOrderStatus';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await dbConnect();

    // Verify order belongs to merchant
    const order = await Order.findOne({ _id: id, merchantId: merchant.merchantId }).lean();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const fulfilments = await Fulfilment.find({ orderId: id }).sort({ createdAt: -1 });
    return NextResponse.json(fulfilments);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch fulfilments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await dbConnect();

    // Verify order belongs to merchant
    const order = await Order.findOne({ _id: id, merchantId: merchant.merchantId }).lean() as any;
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const body = await req.json();
    const { items, tracking, courier, address, shipCostTHB } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items is required' }, { status: 400 });
    }

    const fulfilment = await Fulfilment.create({
      orderId: id,
      merchantId: merchant.merchantId,
      userId: order.userId,
      items,
      tracking: tracking ?? undefined,
      courier: courier ?? undefined,
      address: address ?? undefined,
      shipCostTHB: shipCostTHB ?? 0,
      status: 'pending',
    });

    await recomputeOrderStatus(id);

    return NextResponse.json(fulfilment, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create fulfilment' }, { status: 500 });
  }
}
