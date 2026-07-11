import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Settings, Merchant } from '@/models';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  try {
    await dbConnect();
    const [s, merchant] = await Promise.all([
      Settings.findOne({ merchantId }),
      Merchant.findById(merchantId).select('slug').lean() as Promise<any>,
    ]);
    if (!s) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    return NextResponse.json({
      shopName: s.shopName,
      shopDescription: s.shopDescription || '',
      shopLogoUrl: s.shopLogoUrl || '',
      liffId: s.liffId || null,
      promptPayId: s.promptPayId || null,
      krwRate: s.krwRate ?? 1,
      paymentMethods: s.paymentMethods ?? {},
      bankAccounts: s.bankAccounts ?? [],
      storefront: s.storefront ?? {},
      // Used by the client to build links back into /shop/[slug]/... (e.g. the order-status
      // page link on the post-checkout confirmation screen) without a second round-trip.
      slug: merchant?.slug || null,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch store info' }, { status: 500 });
  }
}
