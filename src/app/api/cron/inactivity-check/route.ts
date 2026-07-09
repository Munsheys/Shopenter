import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { logAudit } from '@/lib/auditLog';
import { pushShopenterLineMessage } from '@/lib/shopenterLine';
import { INACTIVITY_THRESHOLD_DAYS } from '@/lib/inactivity';

export const runtime = 'nodejs';

const GRACE_PERIOD_DAYS = 30; // same window as a merchant-requested deletion
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily job: merchants who haven't logged in for 3 months (any tier, including
 * paying Pro merchants) get scheduled for deletion on the same 30-day grace
 * period as a self-requested deletion, with LINE warnings sent via Shopenter's
 * own Official Account (not the merchant's own channel) at schedule time, and
 * again at ~14 and ~3 days before the actual purge. Logging back in at any
 * point cancels it (see src/lib/inactivity.ts, wired into both login routes).
 *
 * Merchants with no lineUserId (email-only, never linked LINE) can't be
 * reached this way — skipped here rather than silently deleted with zero
 * notification reaching them. Flagged in the response for manual review.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const now = new Date();
    const inactivityCutoff = new Date(now.getTime() - INACTIVITY_THRESHOLD_DAYS * DAY_MS);

    // Stage 1: newly-inactive merchants not yet scheduled for any deletion.
    const newlyInactive = await Merchant.find({
      deletionScheduledFor: null,
      $or: [
        { lastLoginAt: { $lte: inactivityCutoff } },
        { lastLoginAt: null, createdAt: { $lte: inactivityCutoff } },
      ],
    });

    let scheduled = 0;
    let skippedNoLine = 0;

    for (const merchant of newlyInactive) {
      if (!merchant.lineUserId) {
        skippedNoLine++;
        console.warn(`[inactivity-check] Merchant ${merchant._id} is inactive but has no lineUserId — skipped, needs manual review`);
        continue;
      }

      const scheduledFor = new Date(now.getTime() + GRACE_PERIOD_DAYS * DAY_MS);
      merchant.deletionRequestedAt = now;
      merchant.deletionScheduledFor = scheduledFor;
      merchant.deletionReason = 'inactivity';
      merchant.inactivityWarningStage = 1;
      await merchant.save();

      await pushShopenterLineMessage(
        merchant.lineUserId,
        `Hi ${merchant.shopName}, your Shopenter account has been inactive for a while. To keep your shop and data, just log in before ${scheduledFor.toISOString().slice(0, 10)} — after that, your data will be permanently deleted. Logging in cancels this automatically.`
      );

      await logAudit({ merchantId: merchant._id.toString(), action: 'inactivity_deletion_scheduled', resource: 'merchant', status: 'success' });
      scheduled++;
    }

    // Stage 2/3: reminders for merchants already in the grace period.
    const pending = await Merchant.find({ deletionReason: 'inactivity', deletionScheduledFor: { $gt: now } });
    let remindersSent = 0;

    for (const merchant of pending) {
      if (!merchant.lineUserId || !merchant.deletionScheduledFor) continue;
      const daysRemaining = (merchant.deletionScheduledFor.getTime() - now.getTime()) / DAY_MS;

      let nextStageMessage: string | null = null;
      if (daysRemaining <= 14 && merchant.inactivityWarningStage === 1) {
        merchant.inactivityWarningStage = 2;
        nextStageMessage = `Reminder: your Shopenter account will be permanently deleted in about 14 days due to inactivity. Log in anytime before then to keep your shop.`;
      } else if (daysRemaining <= 3 && merchant.inactivityWarningStage === 2) {
        merchant.inactivityWarningStage = 3;
        nextStageMessage = `Final reminder: your Shopenter account and all its data will be permanently deleted in about 3 days due to inactivity. Log in now to cancel this.`;
      }

      if (nextStageMessage) {
        await merchant.save();
        await pushShopenterLineMessage(merchant.lineUserId, nextStageMessage);
        remindersSent++;
      }
    }

    return NextResponse.json({
      message: 'Inactivity check cron completed',
      scheduled,
      skippedNoLine,
      remindersSent,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[inactivity-check cron]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
