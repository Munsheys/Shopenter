import { NextRequest, NextResponse } from 'next/server';
import { CustomerRepo } from '@/lib/repos/customer';
import { SettingsRepo } from '@/lib/repos/settings';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const settings = await SettingsRepo.findByMerchantId(merchantId);
  const loyalty = settings?.loyalty;

  if (!loyalty?.enabled) return NextResponse.json({ enabled: false, points: 0 });

  const customer = await CustomerRepo.findByUserId(merchantId, userId);

  return NextResponse.json({
    enabled: true,
    points: customer?.loyaltyPoints ?? 0,
    redeemRate: loyalty.redeemRate ?? 100,
    minRedeemPoints: loyalty.minRedeemPoints ?? 100,
  });
}
