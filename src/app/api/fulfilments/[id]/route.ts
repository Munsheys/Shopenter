import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Fulfilment } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { recomputeOrderStatus } from '@/lib/recomputeOrderStatus';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await dbConnect();

    const fulfilment = await Fulfilment.findOne({ _id: id, merchantId: merchant.merchantId });
    if (!fulfilment) return NextResponse.json({ error: 'Fulfilment not found' }, { status: 404 });

    const body = await req.json();
    const ALLOWED = ['tracking', 'courier', 'address', 'status', 'shipCostTHB'];
    const update: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (key in body) update[key] = body[key];
    }

    // Handle status timestamp side effects
    if (body.status === 'shipped' && fulfilment.status !== 'shipped') {
      update.shippedAt = new Date();
    }
    if (body.status === 'delivered' && fulfilment.status !== 'delivered') {
      update.deliveredAt = new Date();
    }

    const updated = await Fulfilment.findByIdAndUpdate(id, update, { new: true });

    // Recompute order status after any status change
    if ('status' in body) {
      await recomputeOrderStatus(String(fulfilment.orderId));
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update fulfilment' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await dbConnect();

    const fulfilment = await Fulfilment.findOne({ _id: id, merchantId: merchant.merchantId });
    if (!fulfilment) return NextResponse.json({ error: 'Fulfilment not found' }, { status: 404 });

    if (fulfilment.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending fulfilments can be deleted' }, { status: 400 });
    }

    const orderId = String(fulfilment.orderId);
    await Fulfilment.findByIdAndDelete(id);
    await recomputeOrderStatus(orderId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete fulfilment' }, { status: 500 });
  }
}
