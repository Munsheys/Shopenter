import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const CSRF_TOKEN_COOKIE = 'csrf_token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set CSRF token in response
 */
export function setCsrfToken(res: NextResponse): NextResponse {
  const token = generateCsrfToken();
  res.cookies.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: false,  // Must be accessible to JavaScript to read and send in header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,  // 7 days
    path: '/'
  });
  return res;
}

/**
 * Verify CSRF token from request
 * Returns true if valid, false if invalid or missing
 */
export function verifyCsrfToken(req: NextRequest): boolean {
  const headerToken = req.headers.get(CSRF_TOKEN_HEADER);
  const cookieToken = req.cookies.get(CSRF_TOKEN_COOKIE)?.value;

  if (!headerToken || !cookieToken) {
    return false;
  }

  // Constant time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(cookieToken)
    );
  } catch {
    return false;
  }
}

/**
 * Middleware to check CSRF token on state-changing requests
 */
export function validateCsrfMiddleware(req: NextRequest): { valid: boolean; error?: string } {
  // Only check on state-changing requests
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return { valid: true };  // GET requests don't need CSRF protection
  }

  // Skip CSRF check for specific endpoints (webhooks, etc.)
  const path = req.nextUrl.pathname;
  const skipPaths = [
    '/api/webhook',
    '/api/webhooks',
    '/api/cron',
    '/api/dev/seed',
  ];
  if (skipPaths.some(p => path.startsWith(p))) {
    return { valid: true };
  }

  if (!verifyCsrfToken(req)) {
    return {
      valid: false,
      error: 'CSRF token invalid or missing'
    };
  }

  return { valid: true };
}
