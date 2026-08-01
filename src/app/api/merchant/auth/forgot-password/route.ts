import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { MerchantRepo } from '@/lib/repos/merchant';
import { checkAuthLimit, getClientIp } from '@/lib/rateLimiter';
import { logAudit } from '@/lib/auditLog';
import { pushShopenterLineMessage } from '@/lib/shopenterLine';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const GENERIC_RESPONSE = { message: "If that email is registered, we've sent a password reset link." };

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

    const { ForgotPasswordSchema } = await import('@/lib/validation');
    const validation = ForgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      // Still return the generic response — don't leak validation detail for an
      // account-enumeration-adjacent endpoint.
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const merchant = await MerchantRepo.findByEmail(validation.data.email.toLowerCase().trim());

    // Same response whether or not the account exists — never confirm/deny an email
    // is registered through this endpoint.
    if (!merchant) return NextResponse.json(GENERIC_RESPONSE);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await MerchantRepo.update(merchant.id, {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://shopenter.app';
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    // LINE if the merchant has one linked (same Shopenter-own-OA channel used for every
    // other Shopenter->merchant notice); otherwise fall back to their registered email —
    // the one case in this codebase where email is the only reachable channel.
    if (merchant.lineUserId) {
      await pushShopenterLineMessage(
        merchant.lineUserId,
        `Reset your Shopenter password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this message — your password won't change.`
      );
    } else {
      await sendEmail(
        merchant.email,
        'Reset your Shopenter password',
        `We received a request to reset your Shopenter password.\n\nReset it here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email — your password won't change.`
      );
    }

    await logAudit({ merchantId: merchant.id, action: 'password_reset_requested', resource: 'merchant', status: 'success' }, req);

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (err) {
    console.error('[forgot-password]', err);
    // Generic response even on internal error — no signal either way.
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
