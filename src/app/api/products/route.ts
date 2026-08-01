import { NextRequest, NextResponse } from 'next/server';
import { ProductRepo } from '@/lib/repos/product';
import { MerchantRepo } from '@/lib/repos/merchant';
import { getMerchantFromRequest } from '@/lib/auth';
import { checkCountLimit, type Tier } from '@/lib/tiers';
import { ProductSchema } from '@/lib/validation';
import { logAudit } from '@/lib/auditLog';
import { paginateInMemory, getPaginationParams } from '@/lib/pagination';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { page, limit } = getPaginationParams(searchParams);

    const all = await ProductRepo.listByMerchant(merchant.merchantId);
    const { data, meta } = paginateInMemory(all, page, limit);

    return NextResponse.json({ data, pagination: meta });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const merchantDoc = await MerchantRepo.findById(merchant.merchantId);
    const tier = (merchantDoc?.tier ?? 'free') as Tier;
    const currentCount = await ProductRepo.count(merchant.merchantId);
    const check = checkCountLimit(tier, 'products', currentCount);

    if (!check.allowed) {
      return NextResponse.json(
        { error: 'TIER_LIMIT_REACHED', feature: 'products', limit: check.limit, current: currentCount, requiredTier: 'pro' },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Validate input with Zod
    const validation = ProductSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    const product = await ProductRepo.create({ ...validation.data, merchantId: merchant.merchantId });

    // Audit log
    await logAudit(
      {
        merchantId: merchant.merchantId,
        action: 'product_create',
        resource: 'product',
        resourceId: product.id,
        changes: { after: { name: product.name, price: product.price } },
        status: 'success'
      },
      req
    );

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    // Audit log failure
    await logAudit(
      {
        merchantId: merchant.merchantId,
        action: 'product_create',
        resource: 'product',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      },
      req
    );
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
