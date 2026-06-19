import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const ref = req.nextUrl.searchParams.get('ref');

    if (!ref) {
      return NextResponse.json({ error: 'Referral code required' }, { status: 400 });
    }

    await dbConnect();

    const referrer = await Merchant.findOne({ referralCode: String(ref).toLowerCase() })
      .select('shopName referralCode');

    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    return NextResponse.json({
      shopName: referrer.shopName,
      referralCode: referrer.referralCode,
    });
  } catch (err: any) {
    console.error('[affiliate/validate]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
