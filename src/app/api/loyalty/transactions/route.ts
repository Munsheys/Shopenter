import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { LoyaltyTransaction } from '@/models';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  await dbConnect();
  const query: any = { merchantId: merchant.merchantId };
  if (userId) query.userId = userId;

  const transactions = await LoyaltyTransaction.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json(transactions);
}
