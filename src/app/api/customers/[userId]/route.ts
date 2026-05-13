import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Order } from '@/models';
import { globalMockOrders } from '@/lib/mockData';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {
    await dbConnect();
    const customer = await Customer.findOne({ userId });
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Fetch personal orders for this customer
    const orders = await Order.find({ lineUserId: userId, product: { $exists: true } }).sort({ createdAt: -1 });
    
    return NextResponse.json({ customer, orders });
  } catch (error) {
    // If DB is down, we use empty array for real orders to prevent crashes
    const realOrders: any[] = [];
    
    if (userId === 'mock-user-123') {
      // Combine real orders from DB with mock orders
      return NextResponse.json({
        customer: {
          userId: 'mock-user-123',
          displayName: 'Test Customer (Mock)',
          pictureUrl: 'https://ui-avatars.com/api/?name=Test+Customer&background=00b900&color=fff',
          addresses: [
            '123 Mock Street, Bangkok, 10110',
            'Office 456, Sukhumvit, Bangkok',
            'คุณอลิส 20/411 ประชาชื่น บางตลาด ปากเกร็ด นนทบุรี 11120 0826307887'
          ]
        },
        orders: [...realOrders, ...globalMockOrders]
      });
    }

    if (userId === 'mock-user-456') {
      return NextResponse.json({
        customer: {
          userId: 'mock-user-456',
          displayName: 'น้องฟ้า (New Customer)',
          pictureUrl: 'https://ui-avatars.com/api/?name=NF&background=a78bfa&color=fff',
          addresses: []
        },
        orders: [...realOrders]
      });
    }
    
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const body = await request.json().catch(() => ({}));
  
  try {
    await dbConnect();
    const customer = await Customer.findOneAndUpdate({ userId }, body, { new: true, upsert: true });
    return NextResponse.json(customer);
  } catch (error) {
    if (userId === 'mock-user-123' || userId === 'mock-user-456') {
      // Simulate success for mock user even if DB is down
      return NextResponse.json({
        userId: userId,
        displayName: userId === 'mock-user-123' ? 'Test Customer (Mock)' : 'น้องฟ้า (New Customer)',
        ...body
      });
    }
    console.error("PATCH customer error:", error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}
