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

    // 2. Fetch all settings to know integrations diagnostics and LINE OA Plans
    const allSettings = await Settings.find({});
    const settingsMap = new Map();
    allSettings.forEach(s => settingsMap.set(s.merchantId.toString(), s));

    // 3. Count products and orders dynamically per store (No N+1 queries)
    const productAgg = await Product.aggregate([
      { $group: { _id: '$merchantId', count: { $sum: 1 } } }
    ]);
    const productsCountMap = new Map();
    productAgg.forEach(p => productsCountMap.set(p._id?.toString(), p.count));

    const orderAgg = await Order.aggregate([
      { $group: { _id: '$merchantId', count: { $sum: 1 } } }
    ]);
    const ordersCountMap = new Map();
    orderAgg.forEach(o => ordersCountMap.set(o._id?.toString(), o.count));

    // 4. Map merchants with complete, privacy-shielded real-time LINE OA diagnostics
    const merchantsList = await Promise.all(merchants.map(async (m) => {
      const s = settingsMap.get(m._id.toString());
      
      let lineOAPlan = 'Disconnected';
      let lineQuotaValue = 0;
      let lineQuotaUsage = 0;
      let lineOASyncStatus = 'unconfigured';
      
      // Pull real-time details from LINE Messaging API if credentials are configured
      if (s?.lineChannelAccessToken && s?.lineChannelSecret) {
        try {
          const headers = { 'Authorization': `Bearer ${s.lineChannelAccessToken}` };
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1800);
          
          const [quotaRes, consumptionRes] = await Promise.all([
            fetch('https://api.line.me/v2/bot/message/quota', { headers, signal: controller.signal }).then(r => r.json()),
            fetch('https://api.line.me/v2/bot/message/quota/consumption', { headers, signal: controller.signal }).then(r => r.json())
          ]);
          
          clearTimeout(timeoutId);
          
          if (quotaRes && !quotaRes.message && consumptionRes && !consumptionRes.message) {
            lineOASyncStatus = 'success';
            lineQuotaUsage = consumptionRes.totalUsage || 0;
            
            const type = quotaRes.type;
            const value = quotaRes.value || 0;
            lineQuotaValue = value;
            
            if (type === 'unlimited') {
              lineOAPlan = 'Unlimited';
            } else if (value <= 1000) {
              lineOAPlan = 'Free';
            } else if (value <= 15000) {
              lineOAPlan = 'Basic';
            } else {
              lineOAPlan = 'Pro';
            }
          } else {
            lineOASyncStatus = 'expired';
            lineOAPlan = 'Invalid Token';
          }
        } catch (err) {
          lineOASyncStatus = 'expired';
          lineOAPlan = 'Invalid Token';
        }
      }

      return {
        _id: m._id,
        email: m.email,
        shopName: m.shopName,
        slug: m.slug || null,
        tier: m.tier || 'free',
        paymentStatus: m.paymentStatus || 'trialing',
        createdAt: m.createdAt,
        lineOAPlan,
        lineQuotaValue,
        lineQuotaUsage,
        lineOASyncStatus,
        isLineConfigured: !!(s?.lineChannelAccessToken && s?.lineChannelSecret),
        isLiffConfigured: !!s?.liffId,
        isPromptPayConfigured: !!s?.promptPayId,
        isSlipOkConfigured: !!(s?.slipokApiKey && s?.slipokBranchId),
        productsCount: productsCountMap.get(m._id.toString()) || 0,
        ordersCount: ordersCountMap.get(m._id.toString()) || 0,
      };
    }));

    // 5. System-wide Aggregated Statistics (Keeps individual store statistics anonymous)
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

    // 6. Fetch all feedbacks (including conversation logs and full live store diagnostic context)
    const feedbacks = await Feedback.find({}).sort({ createdAt: -1 });
    const feedbackList = feedbacks.map(f => {
      const mInfo = merchantsList.find(m => m._id.toString() === f.merchantId.toString());
      return {
        _id: f._id,
        merchantId: f.merchantId,
        merchantEmail: f.merchantEmail || mInfo?.email || 'Unknown Merchant',
        merchantShopName: f.merchantShopName || mInfo?.shopName || 'Unknown Shop',
        merchantTier: mInfo?.tier || 'free',
        merchantLineOAPlan: mInfo?.lineOAPlan || 'Disconnected',
        category: f.category,
        content: f.content,
        status: f.status,
        replies: f.replies || [],
        createdAt: f.createdAt,
        diagnostics: {
          isLineConfigured: mInfo?.isLineConfigured || false,
          isLiffConfigured: mInfo?.isLiffConfigured || false,
          isPromptPayConfigured: mInfo?.isPromptPayConfigured || false,
          isSlipOkConfigured: mInfo?.isSlipOkConfigured || false,
          productsCount: mInfo?.productsCount || 0,
          ordersCount: mInfo?.ordersCount || 0,
          lineOASyncStatus: mInfo?.lineOASyncStatus || 'unconfigured',
          lineQuotaValue: mInfo?.lineQuotaValue || 0,
          lineQuotaUsage: mInfo?.lineQuotaUsage || 0,
        }
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
