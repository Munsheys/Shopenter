import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { OrderRepo } from '@/lib/repos/order';
import { CampaignRepo } from '@/lib/repos/campaign';
import { CouponRepo } from '@/lib/repos/coupon';
import { CustomerRepo } from '@/lib/repos/customer';
import { LoyaltyTransactionRepo } from '@/lib/repos/loyaltyTransaction';
import { SettingsRepo } from '@/lib/repos/settings';
import { ProductRepo } from '@/lib/repos/product';
import { verifyLiffIdToken } from '@/lib/platforms/line';
import { notifyMerchant } from '@/lib/notifyMerchant';
import { checkStorefrontLimit, getClientIp } from '@/lib/rateLimiter';

export const runtime = 'nodejs';

// Guard against a single request fanning out into an unbounded number of per-item
// Product lookups (each item does a findOne) — a public endpoint should never let a
// caller dictate how much work the server does. Real carts are nowhere near this.
const MAX_ITEMS_PER_ORDER = 100;

export async function POST(req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;

  // Public, unauthenticated write endpoint — throttle by IP so it can't be used to
  // flood the database, drain LINE push quota, spam the merchant with order alerts,
  // or exhaust stock via the atomic decrement below. Uses the looser storefront limiter
  // (not the auth one) so shared-IP customers behind carrier-grade NAT aren't false-tripped.
  const ip = getClientIp(req);
  const limitCheck = await checkStorefrontLimit(ip);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a moment.', retryAfter: limitCheck.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limitCheck.retryAfter) } }
    );
  }

  try {
    const settings = await SettingsRepo.findByMerchantId(merchantId);
    if (!settings) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });

    const body = await req.json();
    const { couponCode, redeemPoints, lineUserId, userId: bodyUserId, isLiffClient, liffIdToken, ...orderData } = body;
    let userId = bodyUserId || lineUserId; // accept both field names during transition

    // Only a LIFF-verified token proves the caller actually owns `userId`. A guest
    // (external browser) can put any LINE userId in the body, so we treat that identity
    // as unverified and refuse to act on it in ways that touch that user's account
    // (loyalty redemption) or their LINE inbox (confirmation push) — see below.
    let identityVerified = false;

    // LIFF token verification for authentic orders
    if (isLiffClient && liffIdToken) {
      const verified = await verifyLiffIdToken(liffIdToken, settings.liffId);
      if (!verified) return NextResponse.json({ error: 'Invalid LIFF token' }, { status: 401 });
      userId = verified.userId;
      identityVerified = true;
    } else if (isLiffClient) {
      return NextResponse.json({ error: 'LIFF token required' }, { status: 400 });
    }

    if (Array.isArray(orderData.items) && orderData.items.length > MAX_ITEMS_PER_ORDER) {
      return NextResponse.json({ error: `An order cannot contain more than ${MAX_ITEMS_PER_ORDER} line items.` }, { status: 400 });
    }

    let discountAmount = 0;
    let appliedCouponCode = '';
    let redeemedPoints = 0;
    let loyaltyRedeemRate = 100;

    // Recompute total server-side — never trust the client-supplied price
    let baseTotal = 0;
    // Stock to atomically decrement after pricing (only stock-tracked variant items)
    const stockDecrements: Array<{ productId: string; variantLabel: string; qty: number }> = [];
    if (Array.isArray(orderData.items) && orderData.items.length > 0) {
      const recomputedItems = await Promise.all(
        orderData.items.map(async (item: any) => {
          const product = await ProductRepo.findById(merchantId, item.productId);
          const activeProduct = product?.isActive !== false ? product : null;

          let serverPrice: number;
          if (!activeProduct) {
            // Product was deleted — fall back to client-supplied price so the order is not rejected
            serverPrice = item.price ?? 0;
          } else if (activeProduct.variants?.length && item.variantLabel) {
            const matched = activeProduct.variants.find(
              (v: any) => v.variantName === item.variantLabel
            );
            serverPrice = matched?.price ?? activeProduct.price;
            if (activeProduct.trackStock && matched) {
              stockDecrements.push({ productId: activeProduct.id, variantLabel: item.variantLabel, qty: item.qty ?? 1 });
            }
          } else {
            serverPrice = activeProduct.price;
          }

          baseTotal += serverPrice * (item.qty ?? 1);
          return { ...item, price: serverPrice };
        })
      );
      orderData.items = recomputedItems;
    } else {
      // No structured items — fall back to client-supplied total (legacy single-product orders)
      baseTotal = orderData.soldTHB || 0;
    }

    // ── Atomically reserve stock (prevents overselling under concurrency) ────────
    // Each decrement only succeeds if the variant still has enough stock. If any item
    // is short, roll back the ones already decremented and reject the whole order.
    const decremented: typeof stockDecrements = [];
    for (const op of stockDecrements) {
      const ok = await ProductRepo.shiftVariantStockByLabel(merchantId, op.productId, op.variantLabel, -op.qty);
      if (ok) {
        decremented.push(op);
      } else {
        for (const d of decremented) {
          await ProductRepo.shiftVariantStockByLabel(merchantId, d.productId, d.variantLabel, d.qty);
        }
        return NextResponse.json({ error: 'Sorry, one or more items just went out of stock.', outOfStock: true }, { status: 409 });
      }
    }

    // Helper to undo all stock reservations if a later step fails before the order is saved
    const rollbackStock = async () => {
      for (const d of decremented) {
        await ProductRepo.shiftVariantStockByLabel(merchantId, d.productId, d.variantLabel, d.qty);
      }
    };

    // Validate and apply coupon — claim a use atomically so concurrent checkouts
    // can't push usedCount past maxUses.
    if (couponCode) {
      const coupon = await CouponRepo.findByCode(merchantId, String(couponCode));

      const valid = coupon &&
        coupon.isActive &&
        !(coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) &&
        !((coupon.minOrderAmount ?? 0) > 0 && baseTotal < coupon.minOrderAmount!);

      if (valid) {
        const claimed = await CouponRepo.claimUse(merchantId, coupon.code, coupon.maxUses ?? 0);
        if (claimed) {
          discountAmount = coupon.type === 'percent'
            ? Math.floor((baseTotal * coupon.value) / 100)
            : Math.min(coupon.value, baseTotal);
          appliedCouponCode = coupon.code;
        }
      }
    }

    // Validate and apply loyalty point redemption — deduct atomically so the same
    // balance can't be spent twice by concurrent orders. Requires a verified identity:
    // otherwise a guest could supply another customer's userId and burn their points.
    if (redeemPoints && userId && identityVerified) {
      const loyalty = settings.loyalty;

      if (loyalty?.enabled && loyalty.redeemRate > 0) {
        loyaltyRedeemRate = loyalty.redeemRate;
        const customer = await CustomerRepo.findByUserId(merchantId, userId);
        const availablePoints = customer?.loyaltyPoints ?? 0;
        const pointsToRedeem = Math.min(Number(redeemPoints), availablePoints);

        if (pointsToRedeem >= (loyalty.minRedeemPoints ?? 100)) {
          const deducted = await CustomerRepo.deductLoyaltyPointsIfSufficient(merchantId, userId, pointsToRedeem);
          if (deducted) {
            discountAmount += Math.floor(pointsToRedeem / loyalty.redeemRate);
            redeemedPoints = pointsToRedeem;
          }
        }
      }
    }

    const finalTotal = Math.max(0, baseTotal - discountAmount);
    const orderToken = randomUUID();

    let order;
    try {
      order = await OrderRepo.create({
        ...orderData,
        userId,
        platform: 'line',
        merchantId,
        status: 'pending',
        soldTHB: finalTotal,
        discountAmount,
        couponCode: appliedCouponCode,
        redeemedPoints,
        orderToken,
      });
    } catch (err) {
      // Order failed to save — undo the stock reservation, coupon claim, and refund
      // redeemed points so the customer isn't charged for an order that never existed.
      await rollbackStock();
      if (appliedCouponCode) await CouponRepo.releaseUse(merchantId, appliedCouponCode);
      if (redeemedPoints > 0 && userId) {
        await CustomerRepo.incrementLoyaltyPoints(merchantId, userId, redeemedPoints);
      }
      throw err;
    }

    // Record the redemption ledger entry (points were already deducted above)
    if (redeemedPoints > 0 && userId) {
      await LoyaltyTransactionRepo.createRedeem({
        merchantId,
        userId,
        platform: 'line',
        orderId: order.id,
        points: redeemedPoints,
        note: `Redeemed for ฿${Math.floor(redeemedPoints / loyaltyRedeemRate)} discount`,
      });
    }

    // ── Type B: order confirmation message to customer ────────────────────────
    // Deliberately no server-side push here. A LIFF client already self-sends a
    // confirmation via liff.sendMessages() client-side. The only other path — an
    // external-browser caller supplying a userId — is unverified (see identityVerified
    // above), so pushing to it would let anyone spam an arbitrary LINE user's inbox with
    // fake "order confirmed" messages. If a trusted server push is ever needed for
    // external browsers, it must be gated on a verified identity, not a body-supplied one.

    // ── Type A: merchant new-order alert ──────────────────────────────────────
    const customerName = orderData.displayName || 'Customer';
    const itemsSummary = order.items?.map((i: any) => `${i.qty}x ${i.name}`).join(', ') || order.product;
    await notifyMerchant({ merchantId, type: 'new_order', message: `🛒 New order from ${customerName}!\n${itemsSummary}\nTotal: ฿${order.soldTHB!.toLocaleString()}`, metadata: { orderId: order.id, userId }, settings });

    // Attribute to most recent broadcast in last 48 hours
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentCampaign = await CampaignRepo.findMostRecentCompletedInstant(merchantId, since);

    if (recentCampaign) {
      await OrderRepo.update(merchantId, order.id, { attributedCampaignId: recentCampaign.id });
    }

    // Customer-safe response only — the full order doc carries the merchant's cost/profit
    // fields (costTHB, profit, costKRW, rateUsed), which have no business reaching a
    // customer's browser. The storefront client only ever reads soldTHB from this response.
    return NextResponse.json({
      _id: order.id,
      orderToken: order.orderToken,
      status: order.status,
      soldTHB: order.soldTHB,
      discountAmount: order.discountAmount,
      couponCode: order.couponCode,
      items: order.items,
      product: order.product,
      quantity: order.quantity,
      createdAt: order.createdAt,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
