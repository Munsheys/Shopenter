import { Customer, LoyaltyTransaction } from '@/models';

interface OrderLike {
  _id: any;
  userId?: string;
  soldTHB?: number;
  platform?: string;
}

interface LoyaltyConfig {
  enabled?: boolean;
  pointsPerBaht?: number;
}

/**
 * Award loyalty points for an order, idempotently and atomically.
 *
 * Several code paths mark an order paid (manual PATCH, /mark-paid, /batch/mark-paid,
 * and SlipOK verification in the LINE webhook). Previously only the manual PATCH path
 * awarded points, and it used a non-atomic read-modify-write guard that could double
 * credit under concurrency. This centralizes the logic:
 *
 *   - The earn LoyaltyTransaction is created FIRST. A unique partial index on
 *     (orderId, type:'earn') makes a second attempt throw a duplicate-key error, so
 *     points are credited at most once per order regardless of how many paths run.
 *   - Only after the claim succeeds is the customer balance incremented.
 *
 * Returns the number of points awarded (0 if loyalty is off, order has no user/amount,
 * or points were already awarded for this order).
 */
export async function awardLoyaltyForOrder(
  merchantId: string,
  order: OrderLike,
  loyalty: LoyaltyConfig | null | undefined,
): Promise<number> {
  if (!loyalty?.enabled || !(loyalty.pointsPerBaht && loyalty.pointsPerBaht > 0)) return 0;
  if (!order.userId || !(order.soldTHB && order.soldTHB > 0)) return 0;

  const earned = Math.floor(order.soldTHB * loyalty.pointsPerBaht);
  if (earned <= 0) return 0;

  try {
    await LoyaltyTransaction.create({
      merchantId,
      userId: order.userId,
      platform: order.platform || 'line',
      orderId: order._id,
      type: 'earn',
      points: earned,
      note: `Earned from order ฿${order.soldTHB}`,
    });
  } catch (err: any) {
    if (err?.code === 11000) return 0; // already awarded for this order — skip
    throw err;
  }

  await Customer.updateOne(
    { merchantId, userId: order.userId },
    { $inc: { loyaltyPoints: earned } },
  );
  return earned;
}
