import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Settings } from '@/models';
import { messagingApi } from '@line/bot-sdk';

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  
  try {
    await dbConnect();
    
    // Reset unread count
    await Customer.updateOne({ userId }, { $set: { unreadCount: 0 } });

    // Send markAsRead to LINE API
    const settings = await Settings.findOne({ liffId: { $exists: true, $ne: "" } }).sort({ updatedAt: -1 });
    const channelAccessToken = (settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();

    if (channelAccessToken && userId && !userId.startsWith('mock-')) {
      const client = new messagingApi.MessagingApiClient({ channelAccessToken });
      try {
        await client.markMessagesAsRead({
          chat: {
            userId: userId
          }
        });
        console.log(`[LINE API] Marked messages as read for user ${userId}`);
      } catch (lineErr) {
        console.error(`[LINE API] Failed to mark as read for user ${userId}:`, lineErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark as read:", error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
