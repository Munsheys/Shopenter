import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Settings } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { markLineMessagesAsRead } from '@/lib/platforms/line';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const merchant = getMerchantFromRequest(request);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId } = await params;

  try {
    await dbConnect();

    // Reset unread count
    await Customer.updateOne({ merchantId: merchant.merchantId, userId }, { $set: { unreadCount: 0 } });

    // Send markAsRead to LINE API
    const settings = await Settings.findOne({ merchantId: merchant.merchantId });
    const channelAccessToken = (settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();

    if (channelAccessToken && userId && !userId.startsWith('mock-')) {
      await markLineMessagesAsRead(channelAccessToken, userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark as read:", error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
