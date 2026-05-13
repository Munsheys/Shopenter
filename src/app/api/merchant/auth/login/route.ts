import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { comparePassword, signMerchantToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    await dbConnect();

    const merchant = await Merchant.findOne({ email });
    if (!merchant) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await comparePassword(password, merchant.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

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
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
