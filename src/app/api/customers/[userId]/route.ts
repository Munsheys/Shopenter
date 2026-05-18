import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Order } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId } = await params;
  try {
    await dbConnect();
    const customer = await Customer.findOne({ merchantId: merchant.merchantId, userId });
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const orders = await Order.find({ merchantId: merchant.merchantId, lineUserId: userId }).sort({ createdAt: -1 });
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
  const update: Record<string, unknown> = {};
  if (body.addresses !== undefined) update.addresses = body.addresses;
  if (body.status !== undefined) update.status = body.status;

  try {
    await dbConnect();
    const customer = await Customer.findOneAndUpdate(
      { merchantId: merchant.merchantId, userId },
      update,
      { new: true }
    );
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(customer);
  } catch {
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}
