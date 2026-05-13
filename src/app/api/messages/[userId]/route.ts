import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Message } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {
    const merchant = getMerchantFromRequest(request);
    if (!merchant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const messages = await Message.find({ 
      lineUserId: userId,
      merchantId: merchant.merchantId
    }).sort({ createdAt: 1 }).lean();
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
