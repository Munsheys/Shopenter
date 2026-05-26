import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Settings, Message } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await dbConnect();
    const order = await Order.findOne({ _id: id, merchantId: merchant.merchantId });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const settings = await Settings.findOne({ merchantId: merchant.merchantId });
    if (!settings?.lineChannelAccessToken) {
      return NextResponse.json({ error: 'LINE access token not configured' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;
    const qrUrl = `${origin}/api/qr?amount=${order.soldTHB}&ref=${order._id}&merchantId=${merchant.merchantId}`;

    const flexMessage = {
      type: 'flex',
      altText: 'Bank Transfer QR Code',
      contents: {
        type: 'bubble',
        header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '🏦 QR ชำระเงิน', weight: 'bold', color: '#1DB446', size: 'sm' }] },
        hero: { type: 'image', url: qrUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover' },
        body: {
          type: 'box', layout: 'vertical',
          contents: [
            { type: 'text', text: `${order.quantity > 1 ? `${order.quantity}x ` : ''}${order.product?.replace(/^\d+x\s/, '') || 'Order Payment'}`, weight: 'bold', size: 'md', wrap: true },
            { type: 'text', text: `฿${(order.soldTHB || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, weight: 'bold', size: 'xl', color: '#FF334B', margin: 'md' }
          ]
        },
        footer: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: 'สแกน QR ด้วย K PLUS หรือแอปธนาคารอื่น', size: 'xs', color: '#aaaaaa', wrap: true, align: 'center' }] }
      }
    };

    const instructionMessage = {
      type: 'text',
      text: '📸 หลังจากชำระเงินแล้ว กรุณาส่งรูปสลิปโอนเงินเข้ามาในแชทนี้ เพื่อให้ระบบยืนยันการชำระเงินอัตโนมัติค่ะ/ครับ 🙏'
    };

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.lineChannelAccessToken}` },
      body: JSON.stringify({ to: order.userId, messages: [flexMessage, instructionMessage] })
    });
    if (!lineRes.ok) {
      console.error('[LINE push send-qr]', await lineRes.text());
      return NextResponse.json({ error: 'Failed to push LINE message' }, { status: 500 });
    }

    order.paymentQrSent = true;
    await order.save();

    await Message.create({
      merchantId: merchant.merchantId,
      userId: order.userId,
      platform: order.platform || 'line',
      type: 'system',
      text: '🏦 QR Code Sent',
      metadata: { amount: order.soldTHB, product: order.product },
      sender: 'system'
    });

    return NextResponse.json({ success: true, order });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
