import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/rate?from=KRW&to=THB — fetches a live exchange rate from open.er-api.com
export async function GET(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = (searchParams.get('from') || 'THB').toUpperCase();
  const to = (searchParams.get('to') || 'THB').toUpperCase();

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const data = await res.json();
    if (data.result !== 'success' || !data.rates?.[to]) {
      return NextResponse.json({ error: `Rate ${from}→${to} not available` }, { status: 502 });
    }
    return NextResponse.json({ rate: data.rates[to], from, to });
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to fetch live rate: ${err.message}` }, { status: 502 });
  }
}
