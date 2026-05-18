import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Settings, Customer, LoyaltyTransaction } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { sendLineMessage, sendFlexMessage, buildOrderStatusFlex, interpolateTemplate } from '@/lib/line';

export const runtime = 'nodejs';

const NOTIF_FLAG: Record<string, string> = {
  paid:      'notifPaid',
  preparing: 'notifPreparing',
  shipped:   'notifShipped',
  delivered: 'notifDelivered',
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    await dbConnect();

    const before = await Order.findOne({ _id: id, merchantId: merchant.merchantId });
    if (!before) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const order = await Order.findOneAndUpdate(
      { _id: id, merchantId: merchant.merchantId },
      body,
      { new: true }
    );

    const newStatus: string | undefined = body.status;
    const flag = newStatus && NOTIF_FLAG[newStatus];

    // Auto-earn loyalty points when order is marked paid
    if (newStatus === 'paid' && before.status !== 'paid' && order.lineUserId && order.soldTHB > 0) {
      const settings = await Settings.findOne({ merchantId: merchant.merchantId });
      const loyalty = settings?.loyalty;
      if (loyalty?.enabled && loyalty.pointsPerBaht > 0) {
        const earned = Math.floor(order.soldTHB * loyalty.pointsPerBaht);
        if (earned > 0) {
          await Customer.findOneAndUpdate(
            { merchantId: merchant.merchantId, userId: order.lineUserId },
            { $inc: { loyaltyPoints: earned } }
          );
          await LoyaltyTransaction.create({
            merchantId: merchant.merchantId,
            lineUserId: order.lineUserId,
            orderId: order._id,
            type: 'earn',
            points: earned,
            note: `Earned from order ฿${order.soldTHB}`,
          });
        }
      }
    }

    if (flag && before.status !== newStatus && !before[flag] && order.lineUserId) {
      const settings = await Settings.findOne({ merchantId: merchant.merchantId });
      const stage = settings?.orderNotifications?.[newStatus];

      if (stage?.enabled && stage.template && settings?.lineChannelAccessToken) {
        const productText = order.product || order.items?.map((i: any) => i.name).join(', ') || '';
        const templateData = {
          product:  productText,
          amount:   String(order.soldTHB ?? 0),
          tracking: order.tracking || '',
          courier:  order.courier || '',
          name:     order.displayName || '',
        };

        // Try sending a flex message first; fall back to plain text
        const flexContent = buildOrderStatusFlex(newStatus, {
          shopName: settings.shopName || 'Shop',
          product: productText,
          amount: order.soldTHB ?? 0,
          tracking: order.tracking,
          courier: order.courier,
          accentColor: settings.storefront?.accentColor,
        });

        const sent = await sendFlexMessage(
          settings.lineChannelAccessToken,
          order.lineUserId,
          interpolateTemplate(stage.template, templateData),
          flexContent
        ) || await sendLineMessage(
          settings.lineChannelAccessToken,
          order.lineUserId,
          interpolateTemplate(stage.template, templateData)
        );

        if (sent) await Order.findByIdAndUpdate(id, { [flag]: true });
      }
    }

    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await dbConnect();
    const order = await Order.findOneAndDelete({ _id: id, merchantId: merchant.merchantId });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
