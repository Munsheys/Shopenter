import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Campaign, Coupon, Customer, LoyaltyTransaction, Settings } from '@/models';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  try {
    await dbConnect();
    const merchantExists = await Settings.exists({ merchantId });
    if (!merchantExists) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });

    const body = await req.json();
    const { couponCode, redeemPoints, lineUserId, ...orderData } = body;

    let discountAmount = 0;
    let appliedCouponCode = '';
    let redeemedPoints = 0;
    let loyaltyRedeemRate = 100;

    const baseTotal: number = orderData.soldTHB || 0;

    // Validate and apply coupon
    if (couponCode) {
      const coupon = await Coupon.findOne({
        merchantId,
        code: String(couponCode).toUpperCase().trim(),
        isActive: true,
      });

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
    if (redeemPoints && lineUserId) {
      const loyaltySettings = await Settings.findOne({ merchantId }).select('loyalty').lean() as any;
      const loyalty = loyaltySettings?.loyalty;

      if (loyalty?.enabled && loyalty.redeemRate > 0) {
        loyaltyRedeemRate = loyalty.redeemRate;
        const customer = await Customer.findOne({ merchantId, userId: lineUserId }).select('loyaltyPoints').lean() as any;
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
      lineUserId: lineUserId || orderData.lineUserId,
      merchantId,
      soldTHB: finalTotal,
      discountAmount,
      couponCode: appliedCouponCode,
      redeemedPoints,
    });

    // Deduct redeemed points from customer
    if (redeemedPoints > 0 && lineUserId) {
      await Customer.findOneAndUpdate(
        { merchantId, userId: lineUserId },
        { $inc: { loyaltyPoints: -redeemedPoints } }
      );
      await LoyaltyTransaction.create({
        merchantId,
        lineUserId,
        orderId: order._id,
        type: 'redeem',
        points: redeemedPoints,
        note: `Redeemed for ฿${Math.floor(redeemedPoints / loyaltyRedeemRate)} discount`,
      });
    }

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
