import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';
import { paginate, getPaginationParams } from '@/lib/pagination';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();

    // Extract pagination params from URL
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { page, limit } = getPaginationParams(searchParams);

    // Paginate customers
    const query = Customer.find({ merchantId: merchant.merchantId }).sort({ lastSeen: -1 });
    const { data: customers, meta } = await paginate(query, page, limit);

    return NextResponse.json({ data: customers, pagination: meta });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
