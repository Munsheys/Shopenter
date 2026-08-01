import { CustomerRepo } from '@/lib/repos/customer';
import { LoyaltyTransactionRepo } from '@/lib/repos/loyaltyTransaction';

interface OrderLike {
  id: string;
  userId?: string;
  soldTHB?: number;
  platform?: string;
}

interface LoyaltyConfig {
  enabled?: boolean;
  pointsPerBaht?: number;
}

/**
 * Award loyalty points for an order, idempotently.
 *
 * Several code paths mark an order paid (manual PATCH, /mark-paid, /batch/mark-paid,
 * and SlipOK verification in the LINE webhook). This centralizes the logic:
 *
 *   - LoyaltyTransactionRepo.createEarnIfNotClaimed() claims a lock keyed on orderId
 *     FIRST (a conditional PutItem against a dedicated lock table — DynamoDB's
 *     equivalent of the old Mongoose partial-unique-index guard). A second attempt for
 *     the same order returns false instead of throwing, so points are credited at most
 *     once per order regardless of how many paths run concurrently.
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

  const claimed = await LoyaltyTransactionRepo.createEarnIfNotClaimed({
    merchantId,
    userId: order.userId,
    platform: (order.platform as any) || 'line',
    orderId: order.id,
    points: earned,
    note: `Earned from order ฿${order.soldTHB}`,
  });
  if (!claimed) return 0; // already awarded for this order — skip

  await CustomerRepo.incrementLoyaltyPoints(merchantId, order.userId, earned);
  return earned;
}
