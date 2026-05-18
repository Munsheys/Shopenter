import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Order, Campaign, Settings } from '@/models';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  try {
    await dbConnect();
    const merchantExists = await Settings.exists({ merchantId });
    if (!merchantExists) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });

    const body = await req.json();
    const order = await Order.create({ ...body, merchantId });

    // Attribute to most recent broadcast sent in last 48 hours
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
