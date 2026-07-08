import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, FailedLoginAttempt } from '@/models';
import { comparePassword, signMerchantToken } from '@/lib/auth';
import { checkAuthLimit, getClientIp } from '@/lib/rateLimiter';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limit check
    const limitCheck = await checkAuthLimit(ip);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.', retryAfter: limitCheck.retryAfter },
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
    const { LoginSchema } = await import('@/lib/validation');
    const validation = LoginSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    const { email, password } = validation.data;

    await dbConnect();

    const merchant = await Merchant.findOne({ email: email.toLowerCase().trim() });
    if (!merchant) {
      // Log failed attempt
      await FailedLoginAttempt.create({
        email: email.toLowerCase().trim(),
        ip,
        userAgent: req.headers.get('user-agent'),
        timestamp: new Date(),
        reason: 'invalid_email'
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await comparePassword(password, merchant.passwordHash);
    if (!valid) {
      // Log failed attempt
      await FailedLoginAttempt.create({
        email: email.toLowerCase().trim(),
        ip,
        userAgent: req.headers.get('user-agent'),
        timestamp: new Date(),
        reason: 'invalid_password',
        merchantId: merchant._id
      });

      // Get count of recent failed attempts
      const recentFails = await FailedLoginAttempt.countDocuments({
        merchantId: merchant._id,
        timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
      });

      // Notify merchant after 3 failed attempts
      if (recentFails === 3) {
        console.log(`[SECURITY] 3 failed login attempts for ${merchant.email} from ${ip}`);
        // TODO: Send email alert to merchant
      }

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Successful login - clear failed attempts
    await FailedLoginAttempt.deleteMany({
      merchantId: merchant._id,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    const token = signMerchantToken({ merchantId: merchant._id.toString(), email: merchant.email });

    const res = NextResponse.json({ merchantId: merchant._id, email: merchant.email, shopName: merchant.shopName });
    res.cookies.set('merchant_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });
    return res;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
