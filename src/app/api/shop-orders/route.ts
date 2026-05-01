import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Settings } from '@/models';

export async function GET(req: Request) {
  try {
    const secret = req.headers.get('x-admin-secret');
    await dbConnect();

    // Verification Logic: Check DB first, then ENV
    const settings = await Settings.findOne();
    const dbSecret = settings?.adminSecret;
    const envSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET;

    const isValid = (dbSecret && secret === dbSecret) || (envSecret && secret === envSecret);

    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await Order.find({ status: 'pending' }).sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
