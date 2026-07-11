import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { Merchant, Product, Order, Feedback, Settings, Message, Customer, MediaFile, AuditLog } from '@/models';
import { verifyAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

// Free-tier ceilings this stack currently runs on, for the admin "approaching limit" panel.
// Update these if/when a service is upgraded to a paid plan.
const FREE_TIER_LIMITS = {
  mongoStorageMB: 512,           // MongoDB Atlas M0
  r2StorageMB: 10 * 1024,        // Cloudflare R2 free tier: 10 GB
  r2ClassAOpsMonthly: 1_000_000, // Cloudflare R2 free tier: writes (uploads) per month
};

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
        isTelegramConfigured: !!(s?.telegram?.botToken && s?.telegram?.webhookActive),
        isInstagramConfigured: !!(s?.instagram?.pageAccessToken && s?.instagram?.igAccountId && s?.instagram?.webhookActive),
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

    // 6. Infrastructure health metrics
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalMessages, totalCustomers, msgPerDay, dbStats,
      mediaAgg, uploadsThisMonth, failedAuditsLast7Days, pastDueMerchants,
    ] = await Promise.all([
      Message.countDocuments({}),
      Customer.countDocuments({}),
      Message.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Bangkok' } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),
      mongoose.connection.db!.stats(),
      // Sum of every stored media file's size — an estimate of R2 storage used (files deleted
      // directly in R2 outside this app, if any, wouldn't be reflected here).
      MediaFile.aggregate([{ $group: { _id: null, totalBytes: { $sum: '$sizeBytes' }, count: { $sum: 1 } } }]),
      // Proxy for R2 "Class A" (write) operations this month — each upload is ~1 PutObject.
      MediaFile.countDocuments({ createdAt: { $gte: startOfMonth } }),
      AuditLog.countDocuments({ status: 'failed', timestamp: { $gte: sevenDaysAgo } }),
      Merchant.countDocuments({ subscriptionStatus: 'past_due' }),
    ]);

    // Fill in missing days so chart always has 7 points
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD
      const found = msgPerDay.find((r: any) => r._id === key);
      days.push({ date: key, count: found?.count ?? 0 });
    }

    const dbTotalMB = Math.round(((dbStats.storageSize ?? 0) + (dbStats.indexSize ?? 0)) / 1024 / 1024 * 10) / 10;
    const r2StorageMB = Math.round((mediaAgg[0]?.totalBytes ?? 0) / 1024 / 1024 * 10) / 10;

    // Quota watch: each entry is a free-tier ceiling worth flagging before it's hit.
    // `pct` past 75 is a heads-up, past 90 is "upgrade soon."
    const quotas = [
      {
        key: 'mongoStorage',
        label: 'MongoDB storage (Atlas M0 free tier)',
        usedMB: dbTotalMB,
        limitMB: FREE_TIER_LIMITS.mongoStorageMB,
        pct: Math.round((dbTotalMB / FREE_TIER_LIMITS.mongoStorageMB) * 1000) / 10,
      },
      {
        key: 'r2Storage',
        label: 'Cloudflare R2 storage (free tier)',
        usedMB: r2StorageMB,
        limitMB: FREE_TIER_LIMITS.r2StorageMB,
        pct: Math.round((r2StorageMB / FREE_TIER_LIMITS.r2StorageMB) * 1000) / 10,
      },
      {
        key: 'r2ClassAOps',
        label: 'Cloudflare R2 writes this month (free tier)',
        usedMB: uploadsThisMonth, // reused field: count, not MB, for this one
        limitMB: FREE_TIER_LIMITS.r2ClassAOpsMonthly,
        pct: Math.round((uploadsThisMonth / FREE_TIER_LIMITS.r2ClassAOpsMonthly) * 1000) / 10,
      },
    ];

    const infra = {
      totalMessages,
      totalCustomers,
      messagesLast7Days: days,
      messagesToday: days[days.length - 1]?.count ?? 0,
      dbStorageMB: Math.round((dbStats.storageSize ?? 0) / 1024 / 1024 * 10) / 10,
      dbDataMB: Math.round((dbStats.dataSize ?? 0) / 1024 / 1024 * 10) / 10,
      dbIndexMB: Math.round((dbStats.indexSize ?? 0) / 1024 / 1024 * 10) / 10,
      dbTotalMB,
      r2StorageMB,
      r2FileCount: mediaAgg[0]?.count ?? 0,
      r2UploadsThisMonth: uploadsThisMonth,
      quotas,
      failedAuditsLast7Days,
      pastDueMerchants,
      broadcastEnabled: process.env.BROADCAST_ENABLED === 'true',
    };

    // 7. Fetch all feedbacks (including conversation logs and full live store diagnostic context)
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
          isTelegramConfigured: mInfo?.isTelegramConfigured || false,
          isInstagramConfigured: mInfo?.isInstagramConfigured || false,
          productsCount: mInfo?.productsCount || 0,
          ordersCount: mInfo?.ordersCount || 0,
          lineOASyncStatus: mInfo?.lineOASyncStatus || 'unconfigured',
          lineQuotaValue: mInfo?.lineQuotaValue || 0,
          lineQuotaUsage: mInfo?.lineQuotaUsage || 0,
        }
      };
    });

    return NextResponse.json({
      metrics: { totalMerchants, totalProducts, totalOrders, totalRevenue },
      infra,
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

    // Case 0a: Migrate all trialing merchants to paid (free-tier rollout)
    if (action === 'migrate_free_tier') {
      const result = await Merchant.updateMany(
        { paymentStatus: { $in: ['trialing', 'unpaid'] } },
        { $set: { paymentStatus: 'paid' } }
      );
      return NextResponse.json({ success: true, updated: result.modifiedCount });
    }

    // Case 0b: Configure SlipOK credentials for a specific merchant (master admin only)
    if (action === 'configure_slipok') {
      const { merchantId, slipokApiKey, slipokBranchId } = body;
      if (!merchantId) return NextResponse.json({ error: 'merchantId is required' }, { status: 400 });
      await Settings.findOneAndUpdate(
        { merchantId },
        { $set: { slipokApiKey: (slipokApiKey ?? '').trim(), slipokBranchId: (slipokBranchId ?? '').trim() } },
        { upsert: true }
      );
      return NextResponse.json({ success: true });
    }

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
