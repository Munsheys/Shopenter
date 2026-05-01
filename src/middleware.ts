import { NextRequest, NextResponse } from 'next/server';

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET;

export function middleware(request: NextRequest) {
  // Protect all /api routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    // Skip public APIs and first-time setup
    const isPublicGet = request.method === 'GET' && 
      (request.nextUrl.pathname === '/api/shop-info' || 
       request.nextUrl.pathname === '/api/products' ||
       request.nextUrl.pathname === '/api/debug-db');
    
    const isSetupPost = request.method === 'POST' && request.nextUrl.pathname === '/api/settings';

    if (request.nextUrl.pathname === '/api/webhook' || isPublicGet || isSetupPost) {
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
