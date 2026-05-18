import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Product, Merchant } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { checkCountLimit, type Tier } from '@/lib/tiers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const products = await Product.find({ merchantId: merchant.merchantId });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();

    const merchantDoc = await Merchant.findById(merchant.merchantId).select('tier').lean() as any;
    const tier = (merchantDoc?.tier ?? 'free') as Tier;
    const currentCount = await Product.countDocuments({ merchantId: merchant.merchantId });
    const check = checkCountLimit(tier, 'products', currentCount);

    if (!check.allowed) {
      return NextResponse.json(
        { error: 'TIER_LIMIT_REACHED', feature: 'products', limit: check.limit, current: currentCount, requiredTier: 'pro' },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }
    if (typeof body.price !== 'number' || body.price < 0) {
      return NextResponse.json({ error: 'Price must be a non-negative number' }, { status: 400 });
    }
    const product = await Product.create({ ...body, merchantId: merchant.merchantId });
    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
