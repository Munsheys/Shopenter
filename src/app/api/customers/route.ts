import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await dbConnect();
    const customers = await Customer.find({ merchantId: merchant.merchantId }).sort({ lastSeen: -1 });
    return NextResponse.json(customers);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
