import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';

export const runtime = 'nodejs';

// Marks the onboarding wizard as done — called both on actually finishing it and on
// explicitly skipping it. Either way, don't show it again on next login.
export async function POST(req: NextRequest) {
  const session = getMerchantFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  await Merchant.findByIdAndUpdate(session.merchantId, { $set: { onboardingCompletedAt: new Date() } });

  return NextResponse.json({ success: true });
}
