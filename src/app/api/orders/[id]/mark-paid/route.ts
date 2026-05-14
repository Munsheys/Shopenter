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

    order.status = 'paid';
    await order.save();

    let messageText = settings.paymentTemplate || "✅ Payment received!\n\nItem: {product}\nAmount: ฿{amount}\n\nThank you! 🙏";
    const displayProduct = `${(order.quantity || 1) > 1 ? `${order.quantity}x ` : ''}${order.product?.replace(/^\d+x\s/, '') || 'Order'}`;
    messageText = messageText
      .replace(/{product}/g, displayProduct)
      .replace(/{amount}/g, (order.soldTHB || 0).toLocaleString())
      .replace(/{name}/g, order.displayName || 'Customer');

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.lineChannelAccessToken}` },
      body: JSON.stringify({ to: order.lineUserId, messages: [{ type: 'text', text: messageText }] })
    });
    if (!lineRes.ok) console.error('[LINE push mark-paid]', await lineRes.text());

    await Message.create({
      merchantId: merchant.merchantId,
      lineUserId: order.lineUserId,
      type: 'system',
      text: '✅ Payment Confirmed',
      metadata: { amount: order.soldTHB, product: order.product },
      sender: 'system'
    });

    return NextResponse.json({ success: true, order });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
