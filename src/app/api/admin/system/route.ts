import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, Product, Order, Feedback } from '@/models';

export const runtime = 'nodejs';

function verifyAdmin(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  const masterSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET;
  
  if (!masterSecret || secret !== masterSecret) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized system admin secret' }, { status: 401 });
  }

  try {
    await dbConnect();

    // 1. Fetch all merchants (including tier & paymentStatus, excluding sensitive credentials)
    const merchants = await Merchant.find({}).sort({ createdAt: -1 });
    const merchantsList = merchants.map(m => ({
      _id: m._id,
      email: m.email,
      shopName: m.shopName,
      slug: m.slug || null,
      tier: m.tier || 'free',
      paymentStatus: m.paymentStatus || 'trialing',
      createdAt: m.createdAt,
    }));

    // 2. System-wide Aggregated Statistics (Keeps individual store statistics anonymous)
    const totalMerchants = merchants.length;
    const totalProducts = await Product.countDocuments({});
    
    const ordersAgg = await Order.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRevenue: { $sum: '$soldTHB' },
        }
      }
    ]);
    const totalOrders = ordersAgg[0]?.count || 0;
    const totalRevenue = ordersAgg[0]?.totalRevenue || 0;

    // 3. Fetch all feedbacks (including full conversation thread replies)
    const feedbacks = await Feedback.find({}).sort({ createdAt: -1 });
    const feedbackList = feedbacks.map(f => {
      const merchant = merchants.find(m => m._id.toString() === f.merchantId.toString());
      return {
        _id: f._id,
        merchantId: f.merchantId,
        merchantEmail: merchant?.email || 'Unknown Merchant',
        merchantShopName: merchant?.shopName || 'Unknown Shop',
        category: f.category,
        content: f.content,
        status: f.status,
        replies: f.replies || [],
        createdAt: f.createdAt,
      };
    });

    return NextResponse.json({
      metrics: {
        totalMerchants,
        totalProducts,
        totalOrders,
        totalRevenue,
      },
      merchants: merchantsList,
      feedbacks: feedbackList,
    });

  } catch (err) {
    console.error('[Admin System API Error]:', err);
    return NextResponse.json({ error: 'Failed to fetch admin system data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized system admin secret' }, { status: 401 });
  }

  try {
    await dbConnect();
    const body = await req.json();
    const { action, feedbackId } = body;

    if (!feedbackId) {
      return NextResponse.json({ error: 'Feedback ID is required' }, { status: 400 });
    }

    // Case 1: Post administrative reply back to the merchant
    if (action === 'reply') {
      const { content } = body;
      if (!content || !content.trim()) {
        return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
      }

      const updated = await Feedback.findByIdAndUpdate(
        feedbackId,
        { 
          $push: { 
            replies: { sender: 'admin', content: content.trim(), createdAt: new Date() } 
          } 
        },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json({ error: 'Feedback item not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, feedback: updated });
    }

    // Case 2: Update feedback status
    if (action === 'update_status') {
      const { status } = body;
      if (!status || !['new', 'reviewing', 'planned', 'completed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid or missing feedback status' }, { status: 400 });
      }

      const updated = await Feedback.findByIdAndUpdate(
        feedbackId,
        { status },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json({ error: 'Feedback item not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, feedback: updated });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

  } catch (err) {
    return NextResponse.json({ error: 'Failed to process admin action' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized system admin secret' }, { status: 401 });
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const feedbackId = searchParams.get('id');

    if (!feedbackId) {
      return NextResponse.json({ error: 'Feedback ID is required' }, { status: 400 });
    }

    const deleted = await Feedback.findByIdAndDelete(feedbackId);

    if (!deleted) {
      return NextResponse.json({ error: 'Feedback item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: feedbackId });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}
