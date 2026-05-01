import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Product } from '@/models';

export async function GET() {
  try {
    await dbConnect();
    const products = await Product.find({ isActive: true });
    return NextResponse.json(products);
  } catch (error) {
    const mockProducts = [
      {
        _id: 'prod-1',
        name: 'Samorga Card Holder Wallet',
        category: 'Wallets',
        price: 1400,
        imageUrl: 'https://ui-avatars.com/api/?name=Wallet&background=333&color=fff&size=512'
      },
      {
        _id: 'prod-2',
        name: 'BS 4040 Crossbody Bag',
        category: 'Bags',
        price: 2500,
        imageUrl: 'https://ui-avatars.com/api/?name=Bag&background=112&color=fff&size=512'
      }
    ];
    return NextResponse.json(mockProducts);
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const product = await Product.create(body);
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
