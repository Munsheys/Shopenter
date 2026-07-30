import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Message } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { paginate, getPaginationParams } from '@/lib/pagination';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId } = await params;
  try {
    await dbConnect();

    // Extract pagination params from URL (default 50 messages per page)
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { page, limit } = getPaginationParams({ ...searchParams, limit: searchParams.limit || '50' });

    // Paginate messages
    const query = Message.find({ merchantId: merchant.merchantId, userId })
      .sort({ createdAt: -1 }); // Latest first for chat UI
    const { data: messages, meta } = await paginate(query, page, limit);

    // Reverse order for display (oldest to newest in chat bubble order)
    return NextResponse.json({ data: messages.reverse(), pagination: meta });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
