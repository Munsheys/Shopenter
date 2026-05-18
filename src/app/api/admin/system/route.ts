import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, Product, Order, Feedback, Settings } from '@/models';

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

    // 1. Fetch all merchants
    const merchants = await Merchant.find({}).sort({ createdAt: -1 });

    // 2. Fetch all settings to know integrations status
    const allSettings = await Settings.find({});
    const settingsMap = new Map();
    allSettings.forEach(s => {
      settingsMap.set(s.merchantId.toString(), s);
    });

    // Format merchants list with integration stats (preserving customer details privacy)
    const merchantsList = merchants.map(m => {
      const s = settingsMap.get(m._id.toString());
      return {
        _id: m._id,
        email: m.email,
        shopName: m.shopName,
        slug: m.slug || null,
        createdAt: m.createdAt,
        lineConfigured: !!(s?.lineChannelAccessToken && s?.lineChannelSecret),
        promptPayConfigured: !!s?.promptPayId,
        theme: s?.theme || 'light',
      };
    });

    // 3. System-wide Aggregated Statistics (No private customer data exposed)
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

    // 4. Fetch all feedbacks, populating merchant details
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
    const { feedbackId, status } = await req.json();

    if (!feedbackId || !status) {
      return NextResponse.json({ error: 'Feedback ID and status are required' }, { status: 400 });
    }

    if (!['new', 'reviewing', 'planned', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid feedback status' }, { status: 400 });
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

  } catch (err) {
    return NextResponse.json({ error: 'Failed to update feedback status' }, { status: 500 });
  }
}
