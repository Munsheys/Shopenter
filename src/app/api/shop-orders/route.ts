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

    const orders = await Order.find({ status: 'pending' }).sort({ createdAt: -1 });
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
