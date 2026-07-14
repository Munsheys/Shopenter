import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Order, Notification } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();

  const filter = { merchantId: merchant.merchantId };
  const [customers, orders, unreadNotifCount] = await Promise.all([
    Customer.find(filter).sort({ lastSeen: -1 }).lean(),
    Order.find({ ...filter, status: 'pending' }).sort({ createdAt: -1 }).lean(),
    Notification.countDocuments({ merchantId: merchant.merchantId, read: false }),
  ]);

  return NextResponse.json({ customers, orders, unreadNotifCount });
}
