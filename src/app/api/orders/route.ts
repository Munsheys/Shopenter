import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const merchant = getMerchantFromRequest(req);
    if (!merchant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const orders = await Order.find({ merchantId: merchant.merchantId }).sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('API Orders GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // POST to /api/orders might come from storefront, which won't have merchant JWT.
    // However, the migration plan says Phase 3 refactors all APIs to filter by merchantId.
    // Public storefront orders should probably use a separate /api/storefront route or include merchantId in body.
    // For now, let's allow it if merchantId is in the body, or if it's an admin-created order.
    
    await dbConnect();
    const body = await request.json();
    
    const merchant = getMerchantFromRequest(request);
    const merchantId = merchant?.merchantId || body.merchantId;

    if (!merchantId) {
      return NextResponse.json({ error: 'Merchant ID required' }, { status: 400 });
    }

    const order = await Order.create({
      ...body,
      merchantId,
    });
    
    return NextResponse.json(order);
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
