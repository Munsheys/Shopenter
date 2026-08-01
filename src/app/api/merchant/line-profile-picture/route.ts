import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';

export const runtime = 'nodejs';

/**
 * Fetches the merchant's LINE profile picture live via their stored LINE Login access
 * token (merchant.lineAccessToken — from LINE Login/OAuth, distinct from the Messaging
 * API channel token in Settings). Only works for merchants who signed up/linked via
 * LINE, and only while that access token is still valid (LINE Login tokens are
 * short-lived — fine for the onboarding wizard, shown right after signup).
 */
export async function GET(req: NextRequest) {
  const session = getMerchantFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const merchant = await Merchant.findById(session.merchantId).select('lineAccessToken').lean() as any;
  if (!merchant?.lineAccessToken) {
    return NextResponse.json({ pictureUrl: null });
  }

  try {
    const res = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${merchant.lineAccessToken}` },
    });
    if (!res.ok) return NextResponse.json({ pictureUrl: null });
    const data = await res.json();
    return NextResponse.json({ pictureUrl: data.pictureUrl ?? null });
  } catch {
    return NextResponse.json({ pictureUrl: null });
  }
}
