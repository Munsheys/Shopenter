import { NextRequest, NextResponse } from 'next/server';
import { MessageRepo } from '@/lib/repos/message';
import { getMerchantFromRequest } from '@/lib/auth';
import { paginateInMemory, getPaginationParams } from '@/lib/pagination';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId } = await params;
  try {
    // Extract pagination params from URL (default 50 messages per page)
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { page, limit } = getPaginationParams({ ...searchParams, limit: searchParams.limit || '50' });

    // listByConversation returns chronological ascending; reverse to newest-first so
    // page=1 is the most recent 50 messages (matches the old .sort({createdAt:-1}) +
    // skip/limit), then reverse that page back to chronological order for the chat UI.
    const all = await MessageRepo.listByConversation(merchant.merchantId, userId);
    const { data, meta } = paginateInMemory([...all].reverse(), page, limit);

    return NextResponse.json({ data: data.reverse(), pagination: meta });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
