import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Settings } from '@/models';
import { resolveStoreMerchantId } from '@/lib/storeScope';
import ppqr from 'th-promptpay-qr';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const amountStr = searchParams.get('amount');
    const amount = amountStr ? parseFloat(amountStr) : 0;

    await dbConnect();

    // Resolve which merchant this QR belongs to. Without scoping, a bare
    // findOne() returns an arbitrary tenant's PromptPay ID — i.e. money could
    // be collected into the wrong merchant's account.
    const merchantId = await resolveStoreMerchantId(searchParams.get('merchantId'));
    if (!merchantId) {
      return new NextResponse('Merchant not specified', { status: 400 });
    }

    const settings = await Settings.findOne({ merchantId });
    if (!settings || !settings.promptPayId) {
      return new NextResponse('PromptPay ID not configured', { status: 400 });
    }

    const payload = ppqr.getPromptpayCode(settings.promptPayId, amount);
    const buffer = await QRCode.toBuffer(payload, {
      type: 'png',
      margin: 2,
      scale: 10,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error("QR Generation Error:", error);
    return new NextResponse('Failed to generate QR', { status: 500 });
  }
}
