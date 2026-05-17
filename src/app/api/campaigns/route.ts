import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Campaign, Customer, Order } from '@/models';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const campaigns = await Campaign.find({ merchantId: merchant.merchantId })
    .sort({ createdAt: -1 })
    .lean();

  const campaignIds = campaigns.map((c: any) => c._id);
  const stats = await Order.aggregate([
    { $match: { merchantId: new mongoose.Types.ObjectId(merchant.merchantId), attributedCampaignId: { $in: campaignIds } } },
    { $group: { _id: '$attributedCampaignId', orderCount: { $sum: 1 }, revenue: { $sum: '$soldTHB' } } },
  ]);
  const statsMap = new Map(stats.map((s: any) => [String(s._id), s]));

  return NextResponse.json(campaigns.map((c: any) => ({
    ...c,
    attributedOrders: statsMap.get(String(c._id))?.orderCount ?? 0,
    attributedRevenue: statsMap.get(String(c._id))?.revenue ?? 0,
  })));
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages, name = '', durationDays = 7 } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
  }
  if (messages.length > 5) {
    return NextResponse.json({ error: 'Maximum 5 message blocks per campaign' }, { status: 400 });
  }
  if (durationDays < 1 || durationDays > 30) {
    return NextResponse.json({ error: 'Duration must be between 1 and 30 days' }, { status: 400 });
  }

  await dbConnect();

  // Enforce one active queued campaign per merchant
  const existing = await Campaign.findOne({
    merchantId: merchant.merchantId,
    deliveryMode: 'queued',
    status: { $in: ['active', 'paused'] },
  });
  if (existing) {
    return NextResponse.json({ error: 'An active campaign already exists. Pause or cancel it first.' }, { status: 409 });
  }

  const totalTargeted = await Customer.countDocuments({ merchantId: merchant.merchantId, status: { $ne: 'blocked' } });
  const validUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const campaign = await Campaign.create({
    merchantId: merchant.merchantId,
    name,
    deliveryMode: 'queued',
    messages,
    status: 'active',
    validUntil,
    deliveredTo: [],
    totalTargeted,
  });

  return NextResponse.json(campaign, { status: 201 });
}
