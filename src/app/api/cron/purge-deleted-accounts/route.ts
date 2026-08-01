import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import {
  Merchant, Notification, Settings, Product, Customer, CustomerProfile, Order,
  Message, ProcessedEvent, Campaign, AutoReply, MediaFile, Feedback, Coupon,
  LoyaltyTransaction, ProcessedSlip, Fulfilment,
} from '@/models';
import { deleteFromR2 } from '@/lib/r2';
import { logAudit } from '@/lib/auditLog';
import { pushShopenterLineMessage } from '@/lib/shopenterLine';

export const runtime = 'nodejs';

// Compliance/enforcement records are deliberately NOT purged here:
// - AuditLog: has its own 7-year TTL, independent of the merchant's lifecycle
// - AbuseReport / ViolationHistory: enforcement history must survive account deletion,
//   otherwise a terminated merchant could erase their own violation record by deleting
//   and re-registering
// - AffiliateCommission: a shared ledger between two merchants; deleting one party's
//   account shouldn't silently rewrite the other party's reward history
// - FailedLoginAttempt: already self-expires after 24 hours

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const now = new Date();

    const dueMerchants = await Merchant.find({ deletionScheduledFor: { $lte: now } }).lean();

    let purgedCount = 0;
    const errors: string[] = [];

    for (const m of dueMerchants) {
      const merchantId = m._id.toString();
      try {
        // Best-effort delete of actual R2 blobs before removing the DB records that reference them.
        const mediaFiles = await MediaFile.find({ merchantId }).select('r2Key').lean();
        for (const file of mediaFiles) {
          if (file.r2Key) {
            try { await deleteFromR2(file.r2Key); } catch (e) { console.error(`[purge] R2 delete failed for ${file.r2Key}`, e); }
          }
        }

        await Promise.all([
          Notification.deleteMany({ merchantId }),
          Settings.deleteMany({ merchantId }),
          Product.deleteMany({ merchantId }),
          Customer.deleteMany({ merchantId }),
          CustomerProfile.deleteMany({ merchantId }),
          Order.deleteMany({ merchantId }),
          Message.deleteMany({ merchantId }),
          ProcessedEvent.deleteMany({ merchantId }),
          Campaign.deleteMany({ merchantId }),
          AutoReply.deleteMany({ merchantId }),
          MediaFile.deleteMany({ merchantId }),
          Feedback.deleteMany({ merchantId }),
          Coupon.deleteMany({ merchantId }),
          LoyaltyTransaction.deleteMany({ merchantId }),
          ProcessedSlip.deleteMany({ merchantId }),
          Fulfilment.deleteMany({ merchantId }),
        ]);

        // Log before deleting the merchant doc — AuditLog.merchantId is not a foreign-key
        // constraint, so the entry remains valid (and required, for the 7-year record) after this.
        await logAudit({ merchantId, action: 'account_deleted', resource: 'merchant', status: 'success' });

        // Final confirmation, sent before the doc (and merchant.lineUserId with it) is gone.
        // inactivity-check already sent the staged advance warnings — this is the closing
        // message once the deletion has actually happened, not a duplicate of those.
        if (m.lineUserId) {
          try {
            await pushShopenterLineMessage(
              m.lineUserId,
              `Your Shopenter account (${m.shopName}) and all its data have been permanently deleted, as warned. If this was a mistake, you're welcome to sign up again — this doesn't carry over.`
            );
          } catch (err) {
            console.error(`[purge] Termination push failed for ${merchantId}`, err);
          }
        }

        await Merchant.deleteOne({ _id: merchantId });
        purgedCount++;
      } catch (err) {
        console.error(`[purge] Failed to purge merchant ${merchantId}:`, err);
        errors.push(merchantId);
      }
    }

    return NextResponse.json({ success: true, purgedCount, totalDue: dueMerchants.length, errors });
  } catch (err) {
    console.error('[cron/purge-deleted-accounts]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
