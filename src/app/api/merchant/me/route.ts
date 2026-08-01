import { NextRequest, NextResponse } from 'next/server';
import { MerchantRepo } from '@/lib/repos/merchant';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const doc = await MerchantRepo.findById(merchant.merchantId);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      merchantId: merchant.merchantId,
      email: doc.email,
      shopName: doc.shopName,
      slug: doc.slug ?? null,
      hasPassword: !!doc.passwordHash,
      hasLine: !!doc.lineUserId,
      onboardingCompletedAt: doc.onboardingCompletedAt ?? null,
      tier: doc.tier ?? 'free',
      paymentStatus: doc.paymentStatus ?? 'trialing',
      trialEndsAt: doc.trialEndsAt ?? null,
      deletionScheduledFor: doc.deletionScheduledFor ?? null,
      deletionReason: doc.deletionReason ?? null,
      subscriptionStatus: doc.subscriptionStatus ?? 'none',
      nextBillingDate: doc.nextBillingDate ?? null,
      paymentMethodBrand: doc.paymentMethodBrand ?? null,
      paymentMethodLast4: doc.paymentMethodLast4 ?? null,
      proTrialUsedAt: doc.proTrialUsedAt ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { slug } = await req.json();

    if (typeof slug !== 'string') {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    const normalized = slug.trim().toLowerCase();

    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{3}$/.test(normalized)) {
      return NextResponse.json(
        { error: 'Handle must be 3–30 characters: lowercase letters, numbers, and hyphens only. Cannot start or end with a hyphen.' },
        { status: 400 }
      );
    }

    const conflict = await MerchantRepo.existsBySlug(normalized, merchant.merchantId);
    if (conflict) {
      return NextResponse.json({ error: 'That handle is already taken.' }, { status: 409 });
    }

    await MerchantRepo.update(merchant.merchantId, { slug: normalized });
    return NextResponse.json({ slug: normalized });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
