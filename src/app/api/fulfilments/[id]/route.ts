import { NextRequest, NextResponse } from 'next/server';
import { FulfilmentRepo } from '@/lib/repos/fulfilment';
import { getMerchantFromRequest } from '@/lib/auth';
import { recomputeOrderStatus } from '@/lib/recomputeOrderStatus';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const fulfilment = await FulfilmentRepo.findByIdUnknownOrder(id);
    if (!fulfilment || fulfilment.merchantId !== merchant.merchantId) {
      return NextResponse.json({ error: 'Fulfilment not found' }, { status: 404 });
    }

    const body = await req.json();
    const ALLOWED = ['tracking', 'courier', 'address', 'status', 'shipCostTHB', 'items'];
    const update: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (key in body) update[key] = body[key];
    }

    // Handle status timestamp side effects
    if (body.status === 'shipped' && fulfilment.status !== 'shipped') {
      update.shippedAt = new Date().toISOString();
    }
    if (body.status === 'delivered' && fulfilment.status !== 'delivered') {
      update.deliveredAt = new Date().toISOString();
    }

    const updated = await FulfilmentRepo.update(fulfilment.orderId, id, update);

    // Recompute order status after status or items change (empty-item parcels need correction)
    if ('status' in body || 'items' in body) {
      await recomputeOrderStatus(merchant.merchantId, fulfilment.orderId);
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
    const fulfilment = await FulfilmentRepo.findByIdUnknownOrder(id);
    if (!fulfilment || fulfilment.merchantId !== merchant.merchantId) {
      return NextResponse.json({ error: 'Fulfilment not found' }, { status: 404 });
    }

    const orderId = fulfilment.orderId;
    await FulfilmentRepo.delete(orderId, id);
    await recomputeOrderStatus(merchant.merchantId, orderId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete fulfilment' }, { status: 500 });
  }
}
