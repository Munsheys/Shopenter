import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Settings, Message } from '@/models';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const secret = req.headers.get('x-admin-secret');
    if (!(await verifyAuth(secret))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const settings = await Settings.findOne();
    if (!settings || !settings.lineChannelAccessToken) {
      return NextResponse.json({ error: 'LINE access token not configured' }, { status: 400 });
    }

    // Update status
    order.status = 'paid';
    await order.save();

    // Prepare text
    let messageText = settings.paymentTemplate || "✅ Payment received!\n\nItem: {product}\nAmount: ฿{amount}\n\nThank you! 🙏";
    const displayProduct = `${(order.quantity || 1) > 1 ? `${order.quantity}x ` : ''}${order.product?.replace(/^\d+x\s/, '') || 'Order'}`;
    messageText = messageText
      .replace(/{product}/g, displayProduct)
      .replace(/{amount}/g, (order.soldTHB || 0).toLocaleString())
      .replace(/{name}/g, order.displayName || 'Customer');

    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.lineChannelAccessToken}`
      },
      body: JSON.stringify({
        to: order.lineUserId,
        messages: [{
          type: 'text',
          text: messageText
        }]
      })
    });

    if (!lineResponse.ok) {
      const errData = await lineResponse.text();
      console.error("LINE Push Error:", errData);
    }

    await Message.create({
      lineUserId: order.lineUserId,
      type: 'system',
      text: '✅ Payment Confirmed',
      metadata: { amount: order.soldTHB, product: order.product },
      sender: 'system'
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Mark Paid Error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
