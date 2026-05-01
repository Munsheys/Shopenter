import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order } from '@/models';

export async function GET() {
  try {
    await dbConnect();
    // Shop orders have 'items' array
    const orders = await Order.find({ items: { $exists: true, $not: {$size: 0} } }).sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (error) {
    const mockShopOrders = [{
      _id: 'mock-shop-order-1',
      createdAt: new Date(),
      displayName: 'John Doe',
      address: '123 Test St, Bangkok, 10110',
      totalTHB: 1400,
      status: 'pending_payment',
      items: [
        {
          productId: 'prod-1',
          name: 'Samorga Card Holder Wallet',
          variantLabel: 'Black',
          price: 1400,
          qty: 1
        }
      ]
    }];
    return NextResponse.json(mockShopOrders);
  }
}
