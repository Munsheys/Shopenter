import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Campaign, Coupon, Customer, LoyaltyTransaction, Settings, Message, Product } from '@/models';
import { sendLineMessage } from '@/lib/platforms/line';
import { notifyMerchant } from '@/lib/notifyMerchant';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  try {
    await dbConnect();
    const merchantExists = await Settings.exists({ merchantId });
    if (!merchantExists) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });

    const body = await req.json();
    const { couponCode, redeemPoints, lineUserId, userId: bodyUserId, isLiffClient, ...orderData } = body;
    const userId = bodyUserId || lineUserId; // accept both field names during transition

    let discountAmount = 0;
    let appliedCouponCode = '';
    let redeemedPoints = 0;
    let loyaltyRedeemRate = 100;

    // Recompute total server-side — never trust the client-supplied price
    let baseTotal = 0;
    // Stock to atomically decrement after pricing (only stock-tracked variant items)
    const stockDecrements: Array<{ productId: string; variantLabel: string; qty: number }> = [];
    if (Array.isArray(orderData.items) && orderData.items.length > 0) {
      const recomputedItems = await Promise.all(
        orderData.items.map(async (item: any) => {
          const product = await Product.findById(item.productId)
            .select('price variants trackStock')
            .lean() as any;

          let serverPrice: number;
          if (!product) {
            // Product was deleted — fall back to client-supplied price so the order is not rejected
            serverPrice = item.price ?? 0;
          } else if (product.variants?.length && item.variantLabel) {
            const matched = product.variants.find(
              (v: any) => v.variantName === item.variantLabel
            );
            serverPrice = matched?.price ?? product.price;
            if (product.trackStock && matched) {
              stockDecrements.push({ productId: String(product._id), variantLabel: item.variantLabel, qty: item.qty ?? 1 });
            }
          } else {
            serverPrice = product.price;
          }

          baseTotal += serverPrice * (item.qty ?? 1);
          return { ...item, price: serverPrice };
        })
      );
      orderData.items = recomputedItems;
    } else {
      // No structured items — fall back to client-supplied total (legacy single-product orders)
      baseTotal = orderData.soldTHB || 0;
    }

    // ── Atomically reserve stock (prevents overselling under concurrency) ────────
    // Each decrement only succeeds if the variant still has enough stock. If any item
    // is short, roll back the ones already decremented and reject the whole order.
    const decremented: typeof stockDecrements = [];
    for (const op of stockDecrements) {
      const res = await Product.updateOne(
        { _id: op.productId, merchantId, variants: { $elemMatch: { variantName: op.variantLabel, stock: { $gte: op.qty } } } },
        { $inc: { 'variants.$.stock': -op.qty } }
      );
      if (res.modifiedCount === 1) {
        decremented.push(op);
      } else {
        for (const d of decremented) {
          await Product.updateOne(
            { _id: d.productId, 'variants.variantName': d.variantLabel },
            { $inc: { 'variants.$.stock': d.qty } }
          );
        }
        return NextResponse.json({ error: 'Sorry, one or more items just went out of stock.', outOfStock: true }, { status: 409 });
      }
    }

    // Helper to undo all stock reservations if a later step fails before the order is saved
    const rollbackStock = async () => {
      for (const d of decremented) {
        await Product.updateOne(
          { _id: d.productId, 'variants.variantName': d.variantLabel },
          { $inc: { 'variants.$.stock': d.qty } }
        );
      }
    };

    // Validate and apply coupon — claim a use atomically so concurrent checkouts
    // can't push usedCount past maxUses.
    if (couponCode) {
      const coupon = await Coupon.findOne({
        merchantId,
        code: String(couponCode).toUpperCase().trim(),
        isActive: true,
      });

      const valid = coupon &&
        !(coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) &&
        !(coupon.minOrderAmount > 0 && baseTotal < coupon.minOrderAmount);

      if (valid) {
        let claimed = true;
        if (coupon.maxUses > 0) {
          const res = await Coupon.findOneAndUpdate(
            { _id: coupon._id, $expr: { $lt: ['$usedCount', '$maxUses'] } },
            { $inc: { usedCount: 1 } },
          );
          claimed = !!res;
        } else {
          await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
        }
        if (claimed) {
          discountAmount = coupon.type === 'percent'
            ? Math.floor((baseTotal * coupon.value) / 100)
            : Math.min(coupon.value, baseTotal);
          appliedCouponCode = coupon.code;
        }
      }
    }

    // Validate and apply loyalty point redemption — deduct atomically so the same
    // balance can't be spent twice by concurrent orders.
    if (redeemPoints && userId) {
      const loyaltySettings = await Settings.findOne({ merchantId }).select('loyalty').lean() as any;
      const loyalty = loyaltySettings?.loyalty;

      if (loyalty?.enabled && loyalty.redeemRate > 0) {
        loyaltyRedeemRate = loyalty.redeemRate;
        const customer = await Customer.findOne({ merchantId, userId }).select('loyaltyPoints').lean() as any;
        const availablePoints = customer?.loyaltyPoints ?? 0;
        const pointsToRedeem = Math.min(Number(redeemPoints), availablePoints);

        if (pointsToRedeem >= (loyalty.minRedeemPoints ?? 100)) {
          const deducted = await Customer.findOneAndUpdate(
            { merchantId, userId, loyaltyPoints: { $gte: pointsToRedeem } },
            { $inc: { loyaltyPoints: -pointsToRedeem } },
          );
          if (deducted) {
            discountAmount += Math.floor(pointsToRedeem / loyalty.redeemRate);
            redeemedPoints = pointsToRedeem;
          }
        }
      }
    }

    const finalTotal = Math.max(0, baseTotal - discountAmount);

    let order;
    try {
      order = await Order.create({
        ...orderData,
        userId,
        platform: 'line',
        merchantId,
        soldTHB: finalTotal,
        discountAmount,
        couponCode: appliedCouponCode,
        redeemedPoints,
      });
    } catch (err) {
      // Order failed to save — undo the stock reservation and refund redeemed points
      // so the customer isn't charged points for an order that never existed.
      await rollbackStock();
      if (redeemedPoints > 0 && userId) {
        await Customer.updateOne({ merchantId, userId }, { $inc: { loyaltyPoints: redeemedPoints } });
      }
      throw err;
    }

    // Record the redemption ledger entry (points were already deducted above)
    if (redeemedPoints > 0 && userId) {
      await LoyaltyTransaction.create({
        merchantId,
        userId,
        platform: 'line',
        orderId: order._id,
        type: 'redeem',
        points: redeemedPoints,
        note: `Redeemed for ฿${Math.floor(redeemedPoints / loyaltyRedeemRate)} discount`,
      });
    }

    // ── Type B: order confirmation message to customer ────────────────────────
    // LIFF client sends via liff.sendMessages(); external browser gets a push
    if (!isLiffClient && userId) {
      const merchantSettings = await Settings.findOne({ merchantId }).lean() as any;
      if (merchantSettings?.lineChannelAccessToken) {
        try {
          const itemsSummary = order.items?.map((i: any) => `• ${i.qty > 1 ? `${i.qty}x ` : ''}${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''}`).join('\n') || order.product;
          const confirmMsg = `📦 สั่งซื้อแล้ว!\n${itemsSummary}\n\nรวม ฿${order.soldTHB.toLocaleString()}\n\nขอบคุณที่ใช้บริการครับ 🙏`;
          await sendLineMessage(merchantSettings.lineChannelAccessToken, userId, confirmMsg);
          await Message.create({ merchantId, userId, platform: 'line', type: 'system', text: confirmMsg, sender: 'system' });
        } catch (err) { console.error('[storefront order push]', err); }
      }
    }

    // ── Type A: merchant new-order alert ──────────────────────────────────────
    const settingsForNotif = await Settings.findOne({ merchantId }).lean() as any;
    const customerName = orderData.displayName || 'Customer';
    const itemsSummary = order.items?.map((i: any) => `${i.qty}x ${i.name}`).join(', ') || order.product;
    await notifyMerchant({ merchantId, type: 'new_order', message: `🛒 New order from ${customerName}!\n${itemsSummary}\nTotal: ฿${order.soldTHB.toLocaleString()}`, metadata: { orderId: order._id.toString(), userId }, settings: settingsForNotif });

    // Attribute to most recent broadcast in last 48 hours
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentCampaign = await Campaign.findOne({
      merchantId,
      deliveryMode: 'instant',
      status: 'completed',
      sentAt: { $gte: since },
    }).sort({ sentAt: -1 });

    if (recentCampaign) {
      await Order.findByIdAndUpdate(order._id, { attributedCampaignId: recentCampaign._id });
    }

    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
