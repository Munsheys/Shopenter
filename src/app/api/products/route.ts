import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Product, Settings } from '@/models';

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
    const secret = req.headers.get('x-admin-secret');
    await dbConnect();

    // Verification Logic: Check DB first, then ENV
    const settings = await Settings.findOne();
    const dbSecret = settings?.adminSecret;
    const envSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET;

    const isValid = (dbSecret && secret === dbSecret) || (envSecret && secret === envSecret);

    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const product = await Product.create(body);
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
