import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order } from '@/models';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const secret = req.headers.get('x-admin-secret');
    if (!(await verifyAuth(secret))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    await dbConnect();
    let query: any = {};

    if (customerId) query.lineUserId = customerId;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { product: { $regex: search, $options: 'i' } },
        { tracking: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(200);
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    
    // Convert shop payload to Order schema
    const orderData = {
      lineUserId: body.lineUserId,
      displayName: body.displayName,
      // Map totalTHB to soldTHB
      soldTHB: body.totalTHB,
      items: body.items,
      product: body.items.map((i: any) => `${i.qty}x ${i.name}`).join(', '),
      status: 'pending',
      paymentQrSent: false
    };

    const order = await Order.create(orderData);
    return NextResponse.json(order);
  } catch (error) {
    console.error("Shop Order Creation Error:", error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
