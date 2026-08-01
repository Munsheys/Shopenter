import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { hashPassword, signMerchantToken } from '@/lib/auth';
import { checkAuthLimit, getClientIp } from '@/lib/rateLimiter';
import { logAudit } from '@/lib/auditLog';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limitCheck = await checkAuthLimit(ip);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.', retryAfter: limitCheck.retryAfter },
        { status: 429, headers: { 'Retry-After': String(limitCheck.retryAfter) } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { ResetPasswordSchema } = await import('@/lib/validation');
    const validation = ResetPasswordSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    const { token, password } = validation.data;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await dbConnect();
    const merchant = await Merchant.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'This reset link is invalid or has expired. Please request a new one.' }, { status: 400 });
    }

    merchant.passwordHash = await hashPassword(password);
    merchant.passwordResetTokenHash = null;
    merchant.passwordResetExpiresAt = null;
    await merchant.save();

    await logAudit({ merchantId: merchant._id.toString(), action: 'password_reset_completed', resource: 'merchant', status: 'success' }, req);

    // Sign the merchant in immediately, same as signup — no reason to make them log in
    // again right after proving control of the reset link.
    const jwtToken = signMerchantToken({ merchantId: merchant._id.toString(), email: merchant.email });
    const res = NextResponse.json({ merchantId: merchant._id, email: merchant.email, shopName: merchant.shopName });
    res.cookies.set('merchant_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });
    return res;
  } catch (err) {
    console.error('[reset-password]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
