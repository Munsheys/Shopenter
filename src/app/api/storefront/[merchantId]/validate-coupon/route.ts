import { NextRequest, NextResponse } from 'next/server';
import { CouponRepo } from '@/lib/repos/coupon';
import { checkStorefrontLimit, getClientIp } from '@/lib/rateLimiter';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;

  // Public endpoint that reports whether a given code is valid — throttle by IP so it
  // can't be used to brute-force / enumerate a merchant's coupon codes.
  const limitCheck = await checkStorefrontLimit(getClientIp(req));
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again in a moment.', retryAfter: limitCheck.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limitCheck.retryAfter) } }
    );
  }

  const { code, orderTotal } = await req.json().catch(() => ({}));

  if (!code) return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });

  const coupon = await CouponRepo.findByCode(merchantId, String(code));

  if (!coupon || !coupon.isActive) return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 404 });

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 });
  }

  if ((coupon.maxUses ?? 0) > 0 && (coupon.usedCount ?? 0) >= coupon.maxUses!) {
    return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 400 });
  }

  const total = Number(orderTotal) || 0;
  if ((coupon.minOrderAmount ?? 0) > 0 && total < coupon.minOrderAmount!) {
    return NextResponse.json(
      { error: `Minimum order amount ฿${coupon.minOrderAmount!.toLocaleString()} required` },
      { status: 400 }
    );
  }

  const discount = coupon.type === 'percent'
    ? Math.floor((total * coupon.value) / 100)
    : Math.min(coupon.value, total);

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discount,
    description: coupon.type === 'percent'
      ? `${coupon.value}% off`
      : `฿${coupon.value} off`,
  });
}
