import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Settings, Message } from '@/models';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-admin-secret');
    if (!(await verifyAuth(secret))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderIds } = await req.json();
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'No orders provided' }, { status: 400 });
    }

    await dbConnect();
    const orders = await Order.find({ _id: { $in: orderIds } });
    if (orders.length === 0) return NextResponse.json({ error: 'Orders not found' }, { status: 404 });

    const settings = await Settings.findOne();
    if (!settings || !settings.lineChannelAccessToken) {
      return NextResponse.json({ error: 'LINE access token not configured' }, { status: 400 });
    }

    const lineUserId = orders[0].lineUserId;
    const totalTHB = orders.reduce((sum, o) => sum + (o.soldTHB || 0), 0);
    const combinedProducts = orders.map(o => o.product).join(', ');
    const displayName = orders[0].displayName || 'Customer';

    await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { status: 'paid' } }
    );

    let messageText = settings.paymentTemplate || "✅ Payment received!\n\nItem: {product}\nAmount: ฿{amount}\n\nThank you! 🙏";
    messageText = messageText
      .replace(/{product}/g, combinedProducts)
      .replace(/{amount}/g, totalTHB.toLocaleString())
      .replace(/{name}/g, displayName);

    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.lineChannelAccessToken}`
      },
      body: JSON.stringify({
        to: lineUserId,
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
      lineUserId: lineUserId,
      type: 'system',
      text: '✅ Batch Payment Confirmed',
      metadata: { amount: totalTHB, product: combinedProducts },
      sender: 'system'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Batch Mark Paid Error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
