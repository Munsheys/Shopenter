import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyMerchantToken } from './lib/auth';

export const runtime = 'nodejs';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard and /api/merchant routes (except auth)
  if (pathname.startsWith('/dashboard') || (pathname.startsWith('/api/') && !pathname.startsWith('/api/merchant/auth') && !pathname.startsWith('/api/storefront'))) {
    const token = request.cookies.get('merchant_token')?.value;

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = verifyMerchantToken(token);
    if (!payload) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
};
