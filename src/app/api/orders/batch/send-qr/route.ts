import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Settings, Message } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orderIds, overrideAmount } = await req.json();
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: 'No orders provided' }, { status: 400 });
  }

  try {
    await dbConnect();
    const orders = await Order.find({ _id: { $in: orderIds }, merchantId: merchant.merchantId });
    if (orders.length === 0) return NextResponse.json({ error: 'Orders not found' }, { status: 404 });

    const settings = await Settings.findOne({ merchantId: merchant.merchantId });
    if (!settings?.lineChannelAccessToken) {
      return NextResponse.json({ error: 'LINE access token not configured' }, { status: 400 });
    }

    const userId = orders[0].userId;
    const originalTotal = orders.reduce((sum, o) => sum + (o.soldTHB || 0), 0);
    const totalTHB = (typeof overrideAmount === 'number' && overrideAmount > 0) ? overrideAmount : originalTotal;

    // If total was adjusted, redistribute proportionally across orders
    if (totalTHB !== originalTotal && originalTotal > 0) {
      const ratio = totalTHB / originalTotal;
      await Promise.all(orders.map(o =>
        Order.updateOne({ _id: o._id }, { $set: { soldTHB: Math.round((o.soldTHB || 0) * ratio) } })
      ));
    }
    const combinedProducts = orders.map(o => `${(o.quantity || 1) > 1 ? `${o.quantity}x ` : ''}${o.product?.replace(/^\d+x\s/, '')}`).join(' + ');

    const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;
    const qrUrl = `${origin}/api/qr?amount=${totalTHB}&ref=batch&merchantId=${merchant.merchantId}`;

    const flexMessage = {
      type: 'flex',
      altText: 'Bank Transfer QR Code',
      contents: {
        type: 'bubble',
        header: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: '🏦 QR ชำระเงิน (รวมรายการ)', weight: 'bold', color: '#1DB446', size: 'sm' }] },
        hero: { type: 'image', url: qrUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover' },
        body: {
          type: 'box', layout: 'vertical',
          contents: [
            { type: 'text', text: combinedProducts, weight: 'bold', size: 'md', wrap: true },
            { type: 'text', text: `฿${totalTHB.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, weight: 'bold', size: 'xl', color: '#FF334B', margin: 'md' }
          ]
        },
        footer: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: 'สแกน QR ด้วย K PLUS หรือแอปธนาคารอื่น', size: 'xs', color: '#aaaaaa', wrap: true, align: 'center' }] }
      }
    };

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.lineChannelAccessToken}` },
      body: JSON.stringify({ to: userId, messages: [flexMessage, { type: 'text', text: '📸 หลังจากชำระเงินแล้ว กรุณาส่งรูปสลิปโอนเงินเข้ามาในแชทนี้ เพื่อให้ระบบยืนยันการชำระเงินอัตโนมัติค่ะ/ครับ 🙏' }] })
    });
    if (!lineRes.ok) {
      console.error('[LINE push batch-send-qr]', await lineRes.text());
      return NextResponse.json({ error: 'Failed to push LINE message' }, { status: 500 });
    }

    await Order.updateMany({ _id: { $in: orderIds }, merchantId: merchant.merchantId }, { $set: { paymentQrSent: true } });

    await Message.create({
      merchantId: merchant.merchantId,
      userId,
      platform: orders[0].platform || 'line',
      type: 'system',
      text: '🏦 QR Code Sent (Batch)',
      metadata: { amount: totalTHB, product: combinedProducts },
      sender: 'system'
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
