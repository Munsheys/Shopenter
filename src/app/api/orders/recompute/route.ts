import { NextRequest, NextResponse } from 'next/server';
import { FulfilmentRepo } from '@/lib/repos/fulfilment';
import { getMerchantFromRequest } from '@/lib/auth';
import { recomputeOrderStatus } from '@/lib/recomputeOrderStatus';

export const runtime = 'nodejs';

// POST /api/orders/recompute — recompute status for all merchant orders that have fulfilments
export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const fulfilments = await FulfilmentRepo.listByMerchant(merchant.merchantId);
  const orderIds = [...new Set(fulfilments.map((f) => f.orderId))];

  await Promise.all(orderIds.map((id) => recomputeOrderStatus(merchant.merchantId, id)));

  return NextResponse.json({ recomputed: orderIds.length });
}
