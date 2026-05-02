import dbConnect from '@/lib/db';
import { Customer, Order } from '@/models';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret') || '';

  if (!(await verifyAuth(secret))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      // Send initial payload immediately
      const [customers, orders] = await Promise.all([
        Customer.find().sort({ lastSeen: -1 }).lean(),
        Order.find({ status: 'pending' }).sort({ createdAt: -1 }).lean()
      ]);
      send({ type: 'init', customers, orders });

      // Push updates every 4 seconds — far cheaper than client polling
      const interval = setInterval(async () => {
        try {
          const [latestCustomers, latestOrders] = await Promise.all([
            Customer.find().sort({ lastSeen: -1 }).lean(),
            Order.find({ status: 'pending' }).sort({ createdAt: -1 }).lean()
          ]);
          send({ type: 'update', customers: latestCustomers, orders: latestOrders });
        } catch (err) {
          console.error('[SSE] Fetch error:', err);
        }
      }, 4000);

      // Cleanup when client disconnects
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
      'X-Accel-Buffering': 'no' // Disable Nginx buffering on Vercel
    }
  });
}
