import { NextRequest } from 'next/server';
import dbConnect from '@/lib/db';
import { Message } from '@/models';
import { verifyMerchantToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  
  // Extract token from query or cookie
  const token = req.nextUrl.searchParams.get('token') || req.cookies.get('merchant_token')?.value;
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const merchant = verifyMerchantToken(token);
  if (!merchant) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      await dbConnect();

      // Initial load
      try {
        const initialMessages = await Message.find({ 
          lineUserId: userId,
          merchantId: merchant.merchantId
        }).sort({ createdAt: 1 }).lean();
        send(initialMessages);
      } catch (err) {
        console.error('[SSE Messages] Initial fetch error:', err);
      }

      // Poll every 2 seconds
      const interval = setInterval(async () => {
        try {
          const latestMessages = await Message.find({ 
            lineUserId: userId,
            merchantId: merchant.merchantId
          }).sort({ createdAt: 1 }).lean();
          send(latestMessages);
        } catch (err) {
          console.error('[SSE Messages] Fetch error:', err);
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
