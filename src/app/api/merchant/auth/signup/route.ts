import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, Settings, AffiliateCommission } from '@/models';
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
    const { email, password, shopName, referralCode } = await req.json();

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

    // Validate referral code if provided
    let referrerMerchantId = null;
    if (referralCode) {
      const referrer = await Merchant.findOne({ referralCode: String(referralCode).toLowerCase() });
      if (!referrer) {
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
      }
      referrerMerchantId = referrer._id;
    }

    const passwordHash = await hashPassword(password);
    const slug = await generateUniqueSlug(toSlug(shopName));

    // All new signups start with 2-week Pro trial
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    const trialReason = referralCode ? 'referral' : 'signup';

    const merchant = await Merchant.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      shopName,
      slug,
      tier: 'pro',
      paymentStatus: 'trialing',
      trialEndsAt,
      trialReason,
      referredByMerchantId: referrerMerchantId,
    });

    // Bootstrap default settings for the new merchant
    await Settings.create({ merchantId: merchant._id, shopName });

    // If referral, create affiliate commission record
    if (referrerMerchantId && referralCode) {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await AffiliateCommission.create({
        referrerMerchantId,
        referredMerchantId: merchant._id,
        referralCode: String(referralCode).toLowerCase(),
        status: 'pending',
        expiresAt,
      });
    }

    const token = signMerchantToken({ merchantId: merchant._id.toString(), email: merchant.email });

    const res = NextResponse.json({
      merchantId: merchant._id,
      email: merchant.email,
      shopName,
      tier: merchant.tier,
      trialEndsAt: merchant.trialEndsAt,
    }, { status: 201 });
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
