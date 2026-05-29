import { Fulfilment, Order } from '@/models';

export async function recomputeOrderStatus(orderId: string) {
  const fulfilments = await Fulfilment.find({ orderId });
  if (fulfilments.length === 0) return; // no change — status set by merchant manually
  const allDelivered = fulfilments.every(f => f.status === 'delivered');
  const anyShippedOrDelivered = fulfilments.some(f => ['shipped', 'delivered'].includes(f.status));
  let newStatus: string;
  if (allDelivered) newStatus = 'fulfilled';          // all parcels delivered
  else if (anyShippedOrDelivered) newStatus = 'partially_fulfilled';
  else newStatus = 'paid';                            // fulfilments exist but none shipped
  await Order.findByIdAndUpdate(orderId, { status: newStatus });
}
