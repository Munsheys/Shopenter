import { Fulfilment, Order } from '@/models';

export async function recomputeOrderStatus(orderId: string) {
  const fulfilments = await Fulfilment.find({ orderId });
  if (fulfilments.length === 0) return; // no change — status set by merchant manually

  const allDelivered        = fulfilments.every(f => f.status === 'delivered');
  const allShippedOrDelivered = fulfilments.every(f => ['shipped', 'delivered'].includes(f.status));
  const anyShippedOrDelivered = fulfilments.some(f => ['shipped', 'delivered'].includes(f.status));

  let newStatus: string;
  if (allDelivered)          newStatus = 'fulfilled';           // every parcel delivered
  else if (allShippedOrDelivered) newStatus = 'shipped';        // every parcel in transit (some may already be delivered)
  else if (anyShippedOrDelivered) newStatus = 'partially_fulfilled'; // some shipped, some still pending
  else                       newStatus = 'paid';                // fulfilments exist but nothing shipped yet

  await Order.findByIdAndUpdate(orderId, { status: newStatus });
}
