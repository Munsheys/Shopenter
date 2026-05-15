import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, Settings } from '@/models';
import { hashPassword, signMerchantToken } from '@/lib/auth';

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'shop';
}

async function generateUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 2;
  while (await Merchant.findOne({ slug })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, password, shopName } = await req.json();

    if (!email || !password || !shopName) {
      return NextResponse.json({ error: 'email, password, and shopName are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    await dbConnect();

    const existing = await Merchant.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const slug = await generateUniqueSlug(toSlug(shopName));
    const merchant = await Merchant.create({ email: email.toLowerCase().trim(), passwordHash, shopName, slug });

    // Bootstrap default settings for the new merchant
    await Settings.create({ merchantId: merchant._id, shopName });

    const token = signMerchantToken({ merchantId: merchant._id.toString(), email: merchant.email });

    const res = NextResponse.json({ merchantId: merchant._id, email: merchant.email, shopName }, { status: 201 });
    res.cookies.set('merchant_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });
    return res;
  } catch (err) {
    console.error('[signup]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
