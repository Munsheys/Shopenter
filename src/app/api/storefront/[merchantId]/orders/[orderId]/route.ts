import { NextRequest, NextResponse } from 'next/server';
import { OrderRepo } from '@/lib/repos/order';
import { checkStorefrontLimit, getClientIp } from '@/lib/rateLimiter';

export const runtime = 'nodejs';

/**
 * GET /api/storefront/[merchantId]/orders/[orderId]?t=<orderToken>
 * Public, unauthenticated — a customer's only way to check an order without messaging the
 * merchant. Gated by a capability token in `?t=`, same pattern as /api/media/[id]: a bare
 * id alone isn't enough to read someone else's order. Orders created before the token
 * field existed have an empty token and are simply unreachable here (they predate the
 * feature — no data to leak, nothing to migrate).
 *
 * Only customer-safe fields are returned — never cost/profit, never other customers' data.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ merchantId: string; orderId: string }> }
) {
  const { merchantId, orderId } = await params;

  const limitCheck = await checkStorefrontLimit(getClientIp(req));
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a moment.', retryAfter: limitCheck.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limitCheck.retryAfter) } }
    );
  }

  const token = req.nextUrl.searchParams.get('t') ?? '';
  if (!token) {
    // Don't reveal whether the order exists without a token.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const order = await OrderRepo.findById(merchantId, orderId);

    if (!order || !order.orderToken || order.orderToken !== token) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: order.status,
      items: order.items,
      product: order.product,
      quantity: order.quantity,
      soldTHB: order.soldTHB,
      discountAmount: order.discountAmount,
      couponCode: order.couponCode,
      tracking: order.tracking,
      courier: order.courier,
      address: order.address,
      createdAt: order.createdAt,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
