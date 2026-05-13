import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant, Settings } from '@/models';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  try {
    const { merchantId } = await params;
    await dbConnect();

    // In SaaS, we lookup by merchantId
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: merchant.shopName,
      liffId: merchant.liffId,
      adminLineId: merchant.adminLineId,
      krwRate: merchant.krwRate,
      branding: {
        theme: merchant.theme,
      },
      promptPayId: merchant.promptPayId,
      shippingCompanies: merchant.shippingCompanies,
    });
  } catch (error) {
    console.error('Storefront Shop Info GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
