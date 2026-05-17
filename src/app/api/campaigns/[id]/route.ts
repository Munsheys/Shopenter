import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Campaign } from '@/models';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (!['active', 'paused', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status. Use active, paused, or cancelled.' }, { status: 400 });
  }

  await dbConnect();
  const campaign = await Campaign.findOneAndUpdate(
    { _id: id, merchantId: merchant.merchantId },
    { $set: { status } },
    { new: true }
  );

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  return NextResponse.json(campaign);
}
