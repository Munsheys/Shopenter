import { NextRequest, NextResponse } from 'next/server';
import { OrderRepo } from '@/lib/repos/order';
import { SettingsRepo } from '@/lib/repos/settings';
import { FulfilmentRepo } from '@/lib/repos/fulfilment';
import { getMerchantFromRequest } from '@/lib/auth';
import { awardLoyaltyForOrder } from '@/lib/loyalty';
import { sendLineMessage, sendFlexMessage, buildOrderStatusFlex, interpolateTemplate } from '@/lib/platforms/line';
import { logAudit } from '@/lib/auditLog';

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
    const before = await OrderRepo.findById(merchant.merchantId, id);
    if (!before) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Whitelist updatable fields to prevent arbitrary field injection
    const ALLOWED_FIELDS = ['status', 'tracking', 'courier', 'shipCostTHB', 'costKRW', 'costTHB',
      'soldTHB', 'profit', 'rateUsed', 'paymentQrSent', 'trackingSent', 'statusBeforeParcel',
      'address', 'displayName', 'product', 'quantity', 'items', 'userId', 'platform',
      'discount', 'discountAmount', 'redeemedPoints'];
    const safeUpdate: Record<string, any> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) safeUpdate[key] = body[key];
    }

    let order = await OrderRepo.update(merchant.merchantId, id, safeUpdate);

    const newStatus: string | undefined = body.status;
    const flag = newStatus && NOTIF_FLAG[newStatus];

    // Fetch settings once for both loyalty and notification logic
    const needsSettings = (newStatus === 'paid' && before.status !== 'paid') || (!!flag && before.status !== newStatus);
    const settings = needsSettings ? await SettingsRepo.findByMerchantId(merchant.merchantId) : null;

    // Auto-earn loyalty points when order is marked paid (idempotent across all paid paths)
    if (newStatus === 'paid' && before.status !== 'paid' && order) {
      await awardLoyaltyForOrder(merchant.merchantId, order, settings?.loyalty);
    }

    if (flag && before.status !== newStatus && !before[flag as keyof typeof before] && order?.userId) {
      const stage = settings?.orderNotifications?.[newStatus as string];

      if (stage?.enabled && stage.template && settings?.lineChannelAccessToken && (!order.platform || order.platform === 'line')) {
        const productText = order.product || order.items?.map((i: any) => i.name).join(', ') || '';
        const templateData = {
          product:  productText,
          amount:   String(order.soldTHB ?? 0),
          tracking: order.tracking || '',
          courier:  order.courier || '',
          name:     order.displayName || '',
        };

        // Try sending a flex message first; fall back to plain text
        const flexContent = buildOrderStatusFlex(newStatus as string, {
          shopName: settings.shopName || 'Shop',
          product: productText,
          amount: order.soldTHB ?? 0,
          tracking: order.tracking,
          courier: order.courier,
          accentColor: settings.storefront?.accentColor,
        });

        const sent = await sendFlexMessage(
          settings.lineChannelAccessToken,
          order.userId,
          interpolateTemplate(stage.template, templateData),
          flexContent
        ) || await sendLineMessage(
          settings.lineChannelAccessToken,
          order.userId,
          interpolateTemplate(stage.template, templateData)
        );

        if (sent) {
          order = await OrderRepo.update(merchant.merchantId, id, { [flag]: true } as any);
          const { MessageRepo } = await import('@/lib/repos/message');
          await MessageRepo.create({
            merchantId: merchant.merchantId,
            userId: order!.userId!,
            platform: order!.platform || 'line',
            type: 'system',
            text: interpolateTemplate(stage.template, templateData),
            sender: 'system',
          });
        }
      }
    }

    await logAudit(
      { merchantId: merchant.merchantId, action: 'order_update', resource: 'order', resourceId: id, changes: { before: { status: before.status }, after: { status: order?.status } }, status: 'success' },
      req
    );

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
    const order = await OrderRepo.delete(merchant.merchantId, id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    await FulfilmentRepo.deleteAllForOrder(id);

    await logAudit(
      { merchantId: merchant.merchantId, action: 'order_delete', resource: 'order', resourceId: id, status: 'success' },
      req
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
