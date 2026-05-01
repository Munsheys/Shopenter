import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // We handle security inside individual route handlers to support 
  // dynamic database-stored secrets.
  // This middleware ensures that the Gateway can always reach the 
  // settings check to decide between Setup vs Login.
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
