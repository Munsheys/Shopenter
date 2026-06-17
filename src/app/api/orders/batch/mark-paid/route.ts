import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Settings, Message } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { awardLoyaltyForOrder } from '@/lib/loyalty';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { orderIds } = await req.json();
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

    // Award loyalty + flip status per order (idempotent helper guards double-credit)
    const unpaid = orders.filter(o => o.status !== 'paid');
    await Order.updateMany({ _id: { $in: orderIds }, merchantId: merchant.merchantId }, { $set: { status: 'paid' } });
    for (const o of unpaid) {
      await awardLoyaltyForOrder(merchant.merchantId, o, settings.loyalty);
    }

    // The selected orders can belong to DIFFERENT customers — group by userId so each
    // shopper is told only their own total, not the combined sum of everyone's orders.
    const byUser = new Map<string, typeof orders>();
    for (const o of orders) {
      if (!o.userId) continue;
      const list = byUser.get(o.userId) ?? [];
      list.push(o);
      byUser.set(o.userId, list);
    }

    const template = settings.paymentTemplate || "✅ Payment received!\n\nItem: {product}\nAmount: ฿{amount}\n\nThank you! 🙏";

    for (const [userId, userOrders] of byUser) {
      const totalTHB = userOrders.reduce((sum, o) => sum + (o.soldTHB || 0), 0);
      const combinedProducts = userOrders.map(o => `${(o.quantity || 1) > 1 ? `${o.quantity}x ` : ''}${o.product?.replace(/^\d+x\s/, '')}`).join(', ');
      const messageText = template
        .replace(/{product}/g, combinedProducts)
        .replace(/{amount}/g, totalTHB.toLocaleString())
        .replace(/{name}/g, userOrders[0].displayName || 'Customer');

      const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.lineChannelAccessToken}` },
        body: JSON.stringify({ to: userId, messages: [{ type: 'text', text: messageText }] })
      });
      if (!lineRes.ok) console.error('[LINE push batch-mark-paid]', await lineRes.text());

      await Message.create({
        merchantId: merchant.merchantId,
        userId,
        platform: userOrders[0].platform || 'line',
        type: 'system',
        text: '✅ Batch Payment Confirmed',
        metadata: { amount: totalTHB, product: combinedProducts },
        sender: 'system'
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
