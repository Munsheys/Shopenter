import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order } from '@/models';
import { updateMockOrder } from '@/lib/mockData';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    await dbConnect();
    const order = await Order.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(order);
  } catch (error) {
    if (id.startsWith('mock-')) {
      const updatedOrder = updateMockOrder(id, body);
      return NextResponse.json(updatedOrder || { _id: id, ...body });
    }
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await dbConnect();
    await Order.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (id.startsWith('mock-')) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
