import { NextRequest } from 'next/server';
import dbConnect from '@/lib/db';
import { Message, Settings } from '@/models';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const secret = req.nextUrl.searchParams.get('secret') || '';
  const { userId } = await params;

  // Verify secret
  await dbConnect();
  const settings = await Settings.findOne().lean() as any;
  const dbSecret = settings?.adminSecret;
  const envSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET;
  const isValid = (dbSecret && secret === dbSecret) || (envSecret && secret === envSecret);

  if (!isValid) {
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

      // Mock logic for mock-user
      if (userId === 'mock-user-123') {
        const now = Date.now();
        const mockMessages = [
          { _id: 'm1', lineUserId: userId, sender: 'user',  text: 'สวัสดีครับ มีสินค้าแนะนำไหมครับ', createdAt: new Date(now - 86400000 * 2).toISOString() },
          { _id: 'm2', lineUserId: userId, sender: 'admin', text: 'สวัสดีครับ! วันนี้มีครีมบำรุงผิวเกาหลีใหม่เลยครับ 🌿', createdAt: new Date(now - 86400000 * 2 + 60000).toISOString() },
        ];
        send(mockMessages);
        return;
      }

      // Initial load
      try {
        const initialMessages = await Message.find({ lineUserId: userId }).sort({ createdAt: 1 }).lean();
        send(initialMessages);
      } catch (err) {
        console.error('[SSE Messages] Initial fetch error:', err);
      }

      // Poll every 2 seconds
      const interval = setInterval(async () => {
        try {
          const latestMessages = await Message.find({ lineUserId: userId }).sort({ createdAt: 1 }).lean();
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
