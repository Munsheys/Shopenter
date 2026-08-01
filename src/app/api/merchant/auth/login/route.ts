import { NextRequest, NextResponse } from 'next/server';
import { MerchantRepo } from '@/lib/repos/merchant';
import { FailedLoginAttemptRepo } from '@/lib/repos/failedLoginAttempt';
import { comparePassword, signMerchantToken } from '@/lib/auth';
import { checkAuthLimit, getClientIp } from '@/lib/rateLimiter';
import { clearInactivityDeletion } from '@/lib/inactivity';
import { logAudit } from '@/lib/auditLog';
import { pushShopenterLineMessage } from '@/lib/shopenterLine';

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
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const merchant = await MerchantRepo.findByEmail(normalizedEmail);
    if (!merchant) {
      // Log failed attempt
      await FailedLoginAttemptRepo.create({
        email: normalizedEmail,
        ip,
        userAgent: req.headers.get('user-agent'),
        reason: 'invalid_email'
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await comparePassword(password, merchant.passwordHash || '');
    if (!valid) {
      // Log failed attempt
      await FailedLoginAttemptRepo.create({
        email: normalizedEmail,
        ip,
        userAgent: req.headers.get('user-agent'),
        reason: 'invalid_password',
        merchantId: merchant.id
      });

      // Get count of recent failed attempts
      const recentFails = await FailedLoginAttemptRepo.countRecentByMerchant(merchant.id, 15 * 60 * 1000);

      // Notify merchant after 3 failed attempts — LINE only, per policy (never email; email-only
      // merchants who haven't linked LINE can't be reached by Shopenter through any channel yet).
      if (recentFails === 3) {
        console.log(`[SECURITY] 3 failed login attempts for ${merchant.email} from ${ip}`);
        if (merchant.lineUserId) {
          pushShopenterLineMessage(
            merchant.lineUserId,
            `Security alert: 3 failed login attempts on your Shopenter account (${merchant.shopName}) in the last 15 minutes. If this wasn't you, consider changing your password.`
          ).catch(() => {});
        }
      }

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Successful login - clear failed attempts
    await FailedLoginAttemptRepo.deleteRecentByMerchant(merchant.id, 24 * 60 * 60 * 1000);

    const inactivityPatch = clearInactivityDeletion(merchant);
    await MerchantRepo.update(merchant.id, {
      lastLoginAt: new Date().toISOString(),
      lastLoginMethod: 'email',
      ...(inactivityPatch ?? {}),
    });
    if (inactivityPatch) {
      await logAudit({ merchantId: merchant.id, action: 'inactivity_deletion_cancelled', resource: 'merchant', status: 'success' }, req);
    }
    await logAudit({ merchantId: merchant.id, action: 'login', resource: 'merchant', status: 'success' }, req);

    const token = signMerchantToken({ merchantId: merchant.id, email: merchant.email });

    const res = NextResponse.json({ merchantId: merchant.id, email: merchant.email, shopName: merchant.shopName });
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
