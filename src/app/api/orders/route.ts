import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order } from '@/models';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const secret = req.headers.get('x-admin-secret');
    if (!(await verifyAuth(secret))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await Order.find().sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const order = await Order.create(body);
    return NextResponse.json(order);
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
