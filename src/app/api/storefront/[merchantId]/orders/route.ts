import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Campaign, Coupon, Customer, LoyaltyTransaction, Settings, Message, Product } from '@/models';
import { sendLineMessage, verifyLiffIdToken } from '@/lib/platforms/line';
import { notifyMerchant } from '@/lib/notifyMerchant';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  try {
    await dbConnect();
    const settings = await Settings.findOne({ merchantId });
    if (!settings) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });

    const body = await req.json();
    const { couponCode, redeemPoints, lineUserId, userId: bodyUserId, isLiffClient, liffIdToken, ...orderData } = body;
    let userId = bodyUserId || lineUserId;

    if (isLiffClient && liffIdToken) {
      const verified = await verifyLiffIdToken(liffIdToken, settings.liffId);
      if (!verified) return NextResponse.json({ error: 'Invalid LIFF token' }, { status: 401 });
      userId = verified.userId;
    } else if (isLiffClient) {
      return NextResponse.json({ error: 'LIFF token required' }, { status: 400 });
    }

    let discountAmount = 0;
    let appliedCouponCode = '';
    let redeemedPoints = 0;
    let loyaltyRedeemRate = 100;

    // Recompute total server-side — never trust the client-supplied price
    let baseTotal = 0;
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const recomputedItems = await Promise.all(
      orderData.items.map(async (item: any) => {
        const product = await Product.findOne({
          _id: item.productId,
          merchantId,
          isActive: true,
        })
          .select('price variants trackStock stock')
          .lean() as any;

        if (!product) {
          throw new Error(`Product ${item.productId} not found or inactive`);
        }

        let serverPrice: number;
        if (product.variants?.length && item.variantLabel) {
          const matched = product.variants.find(
            (v: any) => v.variantName === item.variantLabel
          );
          serverPrice = matched?.price ?? product.price;
        } else {
          serverPrice = product.price;
        }

        baseTotal += serverPrice * (item.qty ?? 1);
        return { ...item, price: serverPrice, productDoc: product };
      })
    );

    orderData.items = recomputedItems.map(({ productDoc, ...item }: any) => item);

    // Validate and apply coupon
    if (couponCode) {
      const coupon = await Coupon.findOne({
        merchantId,
        code: String(couponCode).toUpperCase().trim(),
        isActive: true,
      }).lean() as any;

      if (coupon && !(coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) &&
          !(coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) &&
          !(coupon.minOrderAmount > 0 && baseTotal < coupon.minOrderAmount)) {
        discountAmount = coupon.type === 'percent'
          ? Math.floor((baseTotal * coupon.value) / 100)
          : Math.min(coupon.value, baseTotal);
        appliedCouponCode = coupon.code;
        await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
      }
    }

    // Validate and apply loyalty point redemption
    if (redeemPoints && userId) {
      const loyaltySettings = await Settings.findOne({ merchantId }).select('loyalty').lean() as any;
      const loyalty = loyaltySettings?.loyalty;

      if (loyalty?.enabled && loyalty.redeemRate > 0) {
        loyaltyRedeemRate = loyalty.redeemRate;
        const customer = await Customer.findOne({ merchantId, userId }).select('loyaltyPoints').lean() as any;
        const availablePoints = customer?.loyaltyPoints ?? 0;
        const pointsToRedeem = Math.min(Number(redeemPoints), availablePoints);

        if (pointsToRedeem >= (loyalty.minRedeemPoints ?? 100)) {
          const pointDiscount = Math.floor(pointsToRedeem / loyalty.redeemRate);
          discountAmount += pointDiscount;
          redeemedPoints = pointsToRedeem;
        }
      }
    }

    const finalTotal = Math.max(0, baseTotal - discountAmount);

    const order = await Order.create({
      ...orderData,
      userId,
      platform: 'line',
      merchantId,
      soldTHB: finalTotal,
      discountAmount,
      couponCode: appliedCouponCode,
      redeemedPoints,
    });

    for (const item of recomputedItems) {
      const product = await Product.findOne({
        _id: item.productId,
        merchantId,
        isActive: true,
      }).lean() as any;

      if (product?.trackStock) {
        if (item.variantLabel && product.variants?.length) {
          await Product.updateOne(
            {
              _id: product._id,
              'variants.variantName': item.variantLabel,
            },
            {
              $inc: { 'variants.$.stock': -(item.qty ?? 1) },
            }
          );
        } else {
          await Product.updateOne(
            { _id: product._id },
            {
              $inc: { stock: -(item.qty ?? 1) },
            }
          );
        }
      }
    }

    // Deduct redeemed points from customer
    if (redeemedPoints > 0 && userId) {
      await Customer.findOneAndUpdate(
        { merchantId, userId },
        { $inc: { loyaltyPoints: -redeemedPoints } }
      );
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
