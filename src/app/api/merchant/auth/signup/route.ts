import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { hashPassword, signMerchantToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { email, password, shopName } = await req.json();

    if (!email || !password || !shopName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    const existingMerchant = await Merchant.findOne({ email });
    if (existingMerchant) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const merchant = await Merchant.create({
      email,
      passwordHash,
      shopName,
    });

    const token = signMerchantToken({
      merchantId: merchant._id.toString(),
      email: merchant.email,
      shopName: merchant.shopName,
    });

    const response = NextResponse.json({
      success: true,
      merchant: {
        id: merchant._id,
        email: merchant.email,
        shopName: merchant.shopName,
      },
    });

    // Set cookie
    response.headers.set('Set-Cookie', `merchant_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`);

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
