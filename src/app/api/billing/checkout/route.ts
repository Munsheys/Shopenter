import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, AffiliateCommission } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { TIER_PRICE_THB, type Tier } from '@/lib/tiers';
import { createCustomerWithCard, chargeCustomer, thbToSatang } from '@/lib/omise';
import { daysFromNow } from '@/lib/affiliate';

export const runtime = 'nodejs';

// Enterprise isn't self-serve — it's arranged individually and activated manually.
const SELF_SERVE_TIERS: Tier[] = ['pro'];

export async function POST(req: NextRequest) {
  const session = getMerchantFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { tier?: string; omiseCardToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const { tier, omiseCardToken } = body;
  if (!tier || !SELF_SERVE_TIERS.includes(tier as Tier)) {
    return NextResponse.json({ error: 'Invalid tier. Enterprise upgrades are arranged individually — contact sales.' }, { status: 400 });
  }
  if (!omiseCardToken) {
    return NextResponse.json({ error: 'Missing card token' }, { status: 400 });
  }

  const priceThb = TIER_PRICE_THB[tier as Tier];
  if (!priceThb) {
    return NextResponse.json({ error: 'No price configured for this tier' }, { status: 400 });
  }

  try {
    await dbConnect();

    const merchant = await Merchant.findById(session.merchantId);
    if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Create (or re-attach a card to) the Omise customer for this merchant.
    const customer = await createCustomerWithCard(merchant.email, omiseCardToken);

    const charge = await chargeCustomer(
      customer.id,
      thbToSatang(priceThb),
      `Shopenter ${tier} subscription — ${merchant.shopName}`
    );

    if (charge.status !== 'successful') {
      await logAudit(
        { merchantId: merchant._id.toString(), action: 'subscription_charge_failed', resource: 'merchant', status: 'failed', errorMessage: charge.failure_message || `Charge status: ${charge.status}` },
        req
      );
      return NextResponse.json({ error: charge.failure_message || 'Card charge did not succeed. Please try another card.' }, { status: 402 });
    }

    const card = customer.cards?.data?.[0];
    merchant.tier = tier;
    merchant.paymentStatus = 'paid';
    merchant.trialEndsAt = null;
    merchant.omiseCustomerId = customer.id;
    merchant.subscriptionStatus = 'active';
    merchant.nextBillingDate = daysFromNow(30);
    merchant.pastDueSince = null;
    merchant.paymentMethodBrand = card?.brand ?? null;
    merchant.paymentMethodLast4 = card?.last_digits ?? null;
    await merchant.save();

    await logAudit(
      { merchantId: merchant._id.toString(), action: 'subscription_started', resource: 'merchant', changes: { after: { tier, priceThb } }, status: 'success' },
      req
    );

    if (merchant.referredByMerchantId) {
      await AffiliateCommission.findOneAndUpdate(
        { referredMerchantId: merchant._id, status: 'pending' },
        { $set: { status: 'converted', convertedAt: new Date() } }
      );
    }

    return NextResponse.json({ tier: merchant.tier, subscriptionStatus: merchant.subscriptionStatus, nextBillingDate: merchant.nextBillingDate });
  } catch (err) {
    console.error('[billing/checkout]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
