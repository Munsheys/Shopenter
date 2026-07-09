import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, Settings, AffiliateCommission } from '@/models';
import { hashPassword, signMerchantToken } from '@/lib/auth';
import { REFERRED_TRIAL_DAYS, PENDING_GRACE_DAYS, daysFromNow } from '@/lib/affiliate';
import { checkAuthLimit, getClientIp } from '@/lib/rateLimiter';
import { toSlug, generateUniqueSlug } from '@/lib/slug';
import { CURRENT_TERMS_VERSION } from '@/lib/legal';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limit check
    const limitCheck = await checkAuthLimit(ip);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.', retryAfter: limitCheck.retryAfter },
        {
          status: 429,
          headers: { 'Retry-After': String(limitCheck.retryAfter) }
        }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Validate input with Zod
    const { SignupSchema } = await import('@/lib/validation');
    const validation = SignupSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    const { email, password, shopName, referralCode } = validation.data;

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
      if (referrer.email === email.toLowerCase().trim()) {
        return NextResponse.json({ error: "You can't refer yourself" }, { status: 400 });
      }
      referrerMerchantId = referrer._id;
    }

    const passwordHash = await hashPassword(password);
    const slug = await generateUniqueSlug(toSlug(shopName));

    // Organic signups start on Free (no card, no trial) — Pro trial is now an explicit
    // opt-in that requires a card (see /api/billing/start-trial). Referred signups keep
    // the automatic no-card trial as the actual growth lever, since it makes sharing a
    // referral link worth more than a cold signup.
    const isReferred = Boolean(referrerMerchantId);
    const trialDays = REFERRED_TRIAL_DAYS;
    const trialEndsAt = isReferred ? daysFromNow(trialDays) : null;

    const merchant = await Merchant.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      shopName,
      slug,
      tier: isReferred ? 'pro' : 'free',
      paymentStatus: isReferred ? 'trialing' : 'paid',
      trialEndsAt,
      trialReason: isReferred ? 'referral' : 'signup',
      referredByMerchantId: referrerMerchantId,
      acceptedTermsAt: new Date(),
      acceptedTermsVersion: CURRENT_TERMS_VERSION,
    });

    // Bootstrap default settings for the new merchant
    await Settings.create({ merchantId: merchant._id, shopName });

    // If referral, create affiliate commission record. The pending window covers
    // the referred merchant's full trial plus a grace period to actually upgrade.
    if (referrerMerchantId && referralCode) {
      const expiresAt = daysFromNow(trialDays + PENDING_GRACE_DAYS);
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
