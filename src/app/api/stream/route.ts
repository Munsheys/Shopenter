import { NextRequest } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Order, Notification } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return new Response('Unauthorized', { status: 401 });

  const encoder = new TextEncoder();

  await dbConnect();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch {}
      };

      const filter = { merchantId: merchant.merchantId };
      const [customers, orders, unreadNotifCount] = await Promise.all([
        Customer.find(filter).sort({ lastSeen: -1 }).lean(),
        Order.find({ ...filter, status: 'pending' }).sort({ createdAt: -1 }).lean(),
        Notification.countDocuments({ merchantId: merchant.merchantId, read: false }),
      ]);
      send({ type: 'init', customers, orders, unreadNotifCount });

      const interval = setInterval(async () => {
        try {
          const [latestCustomers, latestOrders, latestUnread] = await Promise.all([
            Customer.find(filter).sort({ lastSeen: -1 }).lean(),
            Order.find({ ...filter, status: 'pending' }).sort({ createdAt: -1 }).lean(),
            Notification.countDocuments({ merchantId: merchant.merchantId, read: false }),
          ]);
          send({ type: 'update', customers: latestCustomers, orders: latestOrders, unreadNotifCount: latestUnread });
        } catch (err) {
          console.error('[SSE stream] poll error', err);
        }
      }, 4000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
