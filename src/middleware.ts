import { NextRequest, NextResponse } from 'next/server';

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET;

export function middleware(request: NextRequest) {
  // Protect all /api routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    // Skip webhook receiver — LINE needs to POST here without auth
    if (request.nextUrl.pathname === '/api/webhook') {
      return NextResponse.next();
    }

    const secret = request.headers.get('x-admin-secret');
    if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
