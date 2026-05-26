import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Customer, Settings } from '@/models';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  await dbConnect();

  const settings = await Settings.findOne({ merchantId }).select('loyalty').lean() as any;
  const loyalty = settings?.loyalty;

  if (!loyalty?.enabled) return NextResponse.json({ enabled: false, points: 0 });

  const customer = await Customer.findOne({ merchantId, userId }).select('loyaltyPoints').lean() as any;

  return NextResponse.json({
    enabled: true,
    points: customer?.loyaltyPoints ?? 0,
    redeemRate: loyalty.redeemRate ?? 100,
    minRedeemPoints: loyalty.minRedeemPoints ?? 100,
  });
}
