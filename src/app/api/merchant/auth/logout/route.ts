import { NextRequest, NextResponse } from 'next/server';
import { getMerchantFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const merchant = getMerchantFromRequest(req);
  if (merchant) {
    await logAudit({ merchantId: merchant.merchantId, action: 'logout', resource: 'merchant', status: 'success' }, req);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('merchant_token', '', { maxAge: 0, path: '/' });
  return res;
}
