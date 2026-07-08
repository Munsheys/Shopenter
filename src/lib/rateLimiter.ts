import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiters for different operations
export const authLimiter = new RateLimiterMemory({
  points: 5,                    // 5 attempts
  duration: 15 * 60,            // Per 15 minutes
  blockDuration: 15 * 60,       // Lock for 15 minutes
});

export const apiLimiter = new RateLimiterMemory({
  points: 100,                  // 100 requests
  duration: 60,                 // Per minute
  blockDuration: 60,            // Lock for 1 minute
});

export const uploadLimiter = new RateLimiterMemory({
  points: 10,                   // 10 uploads
  duration: 60 * 60,            // Per hour
  blockDuration: 60 * 60,       // Lock for 1 hour
});

/**
 * Rate limit by IP address for auth endpoints
 * Returns true if allowed, false if rate limited
 */
export async function checkAuthLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    await authLimiter.consume(ip);
    return { allowed: true };
  } catch (err: any) {
    // Rate limited
    return {
      allowed: false,
      retryAfter: Math.ceil(err.msBeforeNext / 1000)
    };
  }
}

/**
 * Rate limit by merchant ID for API endpoints
 * Returns true if allowed, false if rate limited
 */
export async function checkApiLimit(merchantId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    await apiLimiter.consume(merchantId);
    return { allowed: true };
  } catch (err: any) {
    return {
      allowed: false,
      retryAfter: Math.ceil(err.msBeforeNext / 1000)
    };
  }
}

/**
 * Get IP address from request
 */
export function getClientIp(req: any): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}
