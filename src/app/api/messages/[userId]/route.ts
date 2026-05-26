import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Message } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId } = await params;
  try {
    await dbConnect();
    const messages = await Message.find({ merchantId: merchant.merchantId, userId })
      .sort({ createdAt: 1 })
      .lean();
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
