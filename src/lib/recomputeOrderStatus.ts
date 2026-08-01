import { OrderRepo } from '@/lib/repos/order';
import { FulfilmentRepo } from '@/lib/repos/fulfilment';

export async function recomputeOrderStatus(merchantId: string, orderId: string) {
  const order = await OrderRepo.findById(merchantId, orderId);
  if (!order) return;

  if (order.status === 'cancelled') return; // Never resurrect cancelled orders

  const fulfilments = await FulfilmentRepo.listByOrder(orderId);
  if (fulfilments.length === 0) return; // no change — status set by merchant manually

  const allDelivered        = fulfilments.every(f => f.status === 'delivered');
  const allShippedOrDelivered = fulfilments.every(f => ['shipped', 'delivered'].includes(f.status));
  const anyShippedOrDelivered = fulfilments.some(f => ['shipped', 'delivered'].includes(f.status));

  let newStatus: string;
  if (allDelivered)          newStatus = 'fulfilled';           // every parcel delivered
  else if (allShippedOrDelivered) newStatus = 'shipped';        // every parcel in transit (some may already be delivered)
  else if (anyShippedOrDelivered) newStatus = 'partially_fulfilled'; // some shipped, some still pending
  else                       newStatus = 'paid';                // fulfilments exist but nothing shipped yet

  await OrderRepo.update(merchantId, orderId, { status: newStatus as any });
}
