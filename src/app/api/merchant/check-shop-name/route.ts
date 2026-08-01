import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Merchant } from '@/models';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Shop names are intentionally NOT unique (only the auto-generated slug is — see
 * src/lib/slug.ts) — two merchants can register the identical display name today and
 * both succeed silently. This endpoint just lets the UI warn about that up front rather
 * than leaving it undetected, without actually blocking the name.
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim();
  if (!name) return NextResponse.json({ taken: false });

  await dbConnect();

  // If the caller is logged in (editing their own storefront), exclude their own
  // account so keeping their existing name doesn't falsely warn.
  const session = getMerchantFromRequest(req);
  const query: Record<string, unknown> = { shopName: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } };
  if (session) query._id = { $ne: session.merchantId };

  const existing = await Merchant.findOne(query).select('_id').lean();
  return NextResponse.json({ taken: !!existing });
}
