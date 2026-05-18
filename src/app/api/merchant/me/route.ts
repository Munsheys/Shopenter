import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const doc = await Merchant.findById(merchant.merchantId).select('email shopName slug tier paymentStatus').lean() as any;
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      merchantId: merchant.merchantId,
      email: doc.email,
      shopName: doc.shopName,
      slug: doc.slug ?? null,
      tier: doc.tier ?? 'free',
      paymentStatus: doc.paymentStatus ?? 'trialing',
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
