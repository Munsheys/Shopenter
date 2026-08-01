import { NextRequest, NextResponse } from 'next/server';
import { SettingsRepo } from '@/lib/repos/settings';
import { getMerchantFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const merchant = getMerchantFromRequest(req);
    if (!merchant) return new NextResponse('Unauthorized', { status: 401 });

    const { messageId } = await params;

    const settings = await SettingsRepo.findByMerchantId(merchant.merchantId);
    if (!settings?.lineChannelAccessToken) {
      return new NextResponse('LINE access token not configured', { status: 400 });
    }

    const imgRes = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: { Authorization: `Bearer ${settings.lineChannelAccessToken}` }
    });

    if (!imgRes.ok) {
      return new NextResponse('Failed to fetch image from LINE', { status: imgRes.status });
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const headers = new Headers();
    headers.set('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=86400, immutable');

    return new NextResponse(arrayBuffer as BodyInit, { headers });
  } catch (error) {
    console.error("Image Proxy Error:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
