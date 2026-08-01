import { NextRequest, NextResponse } from 'next/server';
import { CustomerRepo } from '@/lib/repos/customer';
import { SettingsRepo } from '@/lib/repos/settings';
import { getMerchantFromRequest } from '@/lib/auth';
import { markLineMessagesAsRead } from '@/lib/platforms/line';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const merchant = getMerchantFromRequest(request);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId } = await params;

  try {
    // Reset unread count
    await CustomerRepo.upsert(merchant.merchantId, userId, { unreadCount: 0 });

    // Send markAsRead to LINE API
    const settings = await SettingsRepo.findByMerchantId(merchant.merchantId);
    const channelAccessToken = (settings?.lineChannelAccessToken || '').trim();

    if (channelAccessToken && userId && !userId.startsWith('mock-')) {
      await markLineMessagesAsRead(channelAccessToken, userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark as read:", error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
