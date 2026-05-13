import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Product } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const merchant = getMerchantFromRequest(req);
    if (!merchant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const products = await Product.find({ merchantId: merchant.merchantId });
    return NextResponse.json(products);
  } catch (error) {
    console.error('API Products GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const merchant = getMerchantFromRequest(req);
    if (!merchant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await dbConnect();
    
    const product = await Product.create({
      ...body,
      merchantId: merchant.merchantId,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('API Products POST Error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
