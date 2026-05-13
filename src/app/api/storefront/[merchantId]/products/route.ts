import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Product } from '@/models';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  try {
    const { merchantId } = await params;
    await dbConnect();

    const products = await Product.find({ 
      merchantId,
      isActive: true 
    }).sort({ createdAt: -1 });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Storefront Products GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
