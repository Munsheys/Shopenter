import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { createCustomerWithCard } from '@/lib/omise';
import { daysFromNow } from '@/lib/affiliate';
import { clearInactivityDeletion } from '@/lib/inactivity';

export const runtime = 'nodejs';

const CARD_TRIAL_DAYS = 14;

/**
 * POST /api/billing/start-trial
 * The card-required Pro trial (separate from the automatic no-card referral trial
 * created at signup). Attaches a card and starts a 14-day trial with no charge yet —
 * nextBillingDate is set to the trial end date, so the existing billing-cycle cron
 * automatically attempts the real charge then, converting to a paid subscription
 * unless the merchant cancels first. One trial per merchant (see proTrialUsedAt).
 */
export async function POST(req: NextRequest) {
  const session = getMerchantFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { omiseCardToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  if (!body.omiseCardToken) {
    return NextResponse.json({ error: 'Missing card token' }, { status: 400 });
  }

  try {
    await dbConnect();

    const merchant = await Merchant.findById(session.merchantId);
    if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (merchant.proTrialUsedAt) {
      return NextResponse.json({ error: 'You have already used your Pro trial. Upgrade directly to continue on Pro.' }, { status: 409 });
    }
    if (merchant.tier !== 'free') {
      return NextResponse.json({ error: 'Trial is only available from the Free tier' }, { status: 400 });
    }

    const customer = await createCustomerWithCard(merchant.email, body.omiseCardToken);
    const card = customer.cards?.data?.[0];
    const trialEndsAt = daysFromNow(CARD_TRIAL_DAYS);

    merchant.tier = 'pro';
    merchant.paymentStatus = 'trialing';
    merchant.trialEndsAt = trialEndsAt;
    merchant.trialReason = 'signup';
    merchant.omiseCustomerId = customer.id;
    merchant.subscriptionStatus = 'active';
    merchant.nextBillingDate = trialEndsAt; // first real charge attempt happens here
    merchant.paymentMethodBrand = card?.brand ?? null;
    merchant.paymentMethodLast4 = card?.last_digits ?? null;
    merchant.proTrialUsedAt = new Date();
    // Paying (and trialing-to-pay) tiers are never subject to inactivity deletion.
    clearInactivityDeletion(merchant);
    await merchant.save();

    await logAudit(
      { merchantId: merchant._id.toString(), action: 'trial_started', resource: 'merchant', status: 'success' },
      req
    );

    return NextResponse.json({ tier: merchant.tier, trialEndsAt: merchant.trialEndsAt, subscriptionStatus: merchant.subscriptionStatus });
  } catch (err) {
    console.error('[billing/start-trial]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
