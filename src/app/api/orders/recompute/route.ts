import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Fulfilment } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { recomputeOrderStatus } from '@/lib/recomputeOrderStatus';

export const runtime = 'nodejs';

// POST /api/orders/recompute — recompute status for all merchant orders that have fulfilments
export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();

  // Find all order IDs for this merchant that have at least one fulfilment
  const orderIds = await Fulfilment.distinct('orderId', { merchantId: merchant.merchantId });

  // Verify each orderId belongs to this merchant before recomputing
  const merchantOrders = await Order.find({
    _id: { $in: orderIds },
    merchantId: merchant.merchantId,
  }).select('_id').lean();

  const validIds = merchantOrders.map((o: any) => String(o._id));

  await Promise.all(validIds.map(id => recomputeOrderStatus(id)));

  return NextResponse.json({ recomputed: validIds.length });
}
