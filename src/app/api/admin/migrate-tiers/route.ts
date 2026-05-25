import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';

export const runtime = 'nodejs';

// One-time migration: upgrades all existing 'free' tier merchants to 'enterprise'.
// New signups remain on 'free' by default.
// Usage: GET /api/admin/migrate-tiers?secret=YOUR_ADMIN_SECRET
// Safe to call multiple times — only affects merchants still on 'free'.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const result = await Merchant.updateMany({ tier: 'free' }, { $set: { tier: 'enterprise' } });

  return NextResponse.json({
    ok: true,
    upgraded: result.modifiedCount,
    message: `${result.modifiedCount} merchant(s) upgraded to enterprise.`,
  });
}
