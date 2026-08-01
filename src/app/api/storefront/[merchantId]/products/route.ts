import { NextRequest, NextResponse } from 'next/server';
import { ProductRepo } from '@/lib/repos/product';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  try {
    const products = await ProductRepo.listActiveByMerchant(merchantId);
    // Never expose merchant's cost data to the public storefront
    const sanitized = products.map(({ maxPrice, variants, ...rest }) => ({
      ...rest,
      variants: variants?.map(({ cost, ...v }) => v),
    }));
    return NextResponse.json(sanitized);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
