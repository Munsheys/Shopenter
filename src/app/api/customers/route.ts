import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const merchant = getMerchantFromRequest(req);
    if (!merchant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const customers = await Customer.find({ merchantId: merchant.merchantId }).sort({ lastSeen: -1 });
    return NextResponse.json(customers);
  } catch (error) {
    console.error('API Customers GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
