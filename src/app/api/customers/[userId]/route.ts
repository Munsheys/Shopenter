import { NextRequest, NextResponse } from 'next/server';
import { CustomerRepo } from '@/lib/repos/customer';
import { OrderRepo } from '@/lib/repos/order';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId } = await params;
  try {
    const customer = await CustomerRepo.findByUserId(merchant.merchantId, userId);
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const orders = (await OrderRepo.listByMerchant(merchant.merchantId)).filter((o) => o.userId === userId);
    return NextResponse.json({ customer, orders });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const existing = await CustomerRepo.findByUserId(merchant.merchantId, userId);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Atomic credit increment — handled separately to avoid overwrite race
    if (body.addCredits !== undefined) {
      await CustomerRepo.incrementShopCredits(merchant.merchantId, userId, Number(body.addCredits));
      const updated = await CustomerRepo.findByUserId(merchant.merchantId, userId);
      return NextResponse.json(updated);
    }

    const update: Record<string, unknown> = {};
    if (body.addresses !== undefined) update.addresses = body.addresses;
    if (body.status !== undefined) update.status = body.status;

    const customer = await CustomerRepo.upsert(merchant.merchantId, userId, update);
    return NextResponse.json(customer);
  } catch {
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}
