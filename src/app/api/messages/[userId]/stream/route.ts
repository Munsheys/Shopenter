import { NextRequest } from 'next/server';
import dbConnect from '@/lib/db';
import { Message } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return new Response('Unauthorized', { status: 401 });

  const { userId } = await params;
  const encoder = new TextEncoder();

  await dbConnect();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch {}
      };

      try {
        const initial = await Message.find({ merchantId: merchant.merchantId, userId }).sort({ createdAt: 1 }).lean();
        send(initial);
      } catch (err) {
        console.error('[SSE messages] initial fetch', err);
      }

      const interval = setInterval(async () => {
        try {
          const latest = await Message.find({ merchantId: merchant.merchantId, userId }).sort({ createdAt: 1 }).lean();
          send(latest);
        } catch (err) {
          console.error('[SSE messages] poll error', err);
        }
      }, 2000);

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
