import { NextRequest, NextResponse } from 'next/server';
import { OrderRepo } from '@/lib/repos/order';
import { SettingsRepo } from '@/lib/repos/settings';
import { MessageRepo } from '@/lib/repos/message';
import { getMerchantFromRequest } from '@/lib/auth';
import { awardLoyaltyForOrder } from '@/lib/loyalty';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const order = await OrderRepo.findById(merchant.merchantId, id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const settings = await SettingsRepo.findByMerchantId(merchant.merchantId);
    if (!settings?.lineChannelAccessToken) {
      return NextResponse.json({ error: 'LINE access token not configured' }, { status: 400 });
    }

    const wasPaid = order.status === 'paid';
    const updated = await OrderRepo.update(merchant.merchantId, id, { status: 'paid' });

    // Award loyalty points on the first transition to paid (idempotent via the helper)
    if (!wasPaid && updated) {
      await awardLoyaltyForOrder(merchant.merchantId, updated, settings.loyalty);
    }

    let messageText = settings.paymentTemplate || "✅ Payment received!\n\nItem: {product}\nAmount: ฿{amount}\n\nThank you! 🙏";
    const displayProduct = `${(order.quantity || 1) > 1 ? `${order.quantity}x ` : ''}${order.product?.replace(/^\d+x\s/, '') || 'Order'}`;
    messageText = messageText
      .replace(/{product}/g, displayProduct)
      .replace(/{amount}/g, (order.soldTHB || 0).toLocaleString())
      .replace(/{name}/g, order.displayName || 'Customer');

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.lineChannelAccessToken}` },
      body: JSON.stringify({ to: order.userId, messages: [{ type: 'text', text: messageText }] })
    });
    if (!lineRes.ok) console.error('[LINE push mark-paid]', await lineRes.text());

    await MessageRepo.create({
      merchantId: merchant.merchantId,
      userId: order.userId!,
      platform: order.platform || 'line',
      type: 'system',
      text: '✅ Payment Confirmed',
      metadata: { amount: order.soldTHB, product: order.product },
      sender: 'system'
    });

    return NextResponse.json({ success: true, order: updated });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
