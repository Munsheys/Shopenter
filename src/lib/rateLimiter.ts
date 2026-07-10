import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

// In-memory limiters only work correctly on a single instance — Vercel runs multiple
// concurrent serverless instances, so a 5-attempts/15-min limit was actually
// ~5×N attempts in production. When REDIS_URL is configured (e.g. Upstash's TCP
// endpoint, ioredis-compatible), rate limits are shared across all instances instead.
// Falls back to the old in-memory behavior if REDIS_URL isn't set, rather than
// breaking auth/API routes outright.
const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

let redisClient: Redis | null = null;
if (redisUrl) {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1, // fail fast rather than hang a request on a flaky connection
    enableOfflineQueue: false,
  });
  redisClient.on('error', (err) => console.error('[rateLimiter] Redis connection error:', err.message));
} else {
  console.warn('[rateLimiter] REDIS_URL not set — using in-memory rate limiting (per-instance only, not shared across serverless instances)');
}

function makeLimiter(keyPrefix: string, points: number, duration: number, blockDuration: number) {
  const memoryFallback = new RateLimiterMemory({ points, duration, blockDuration });
  if (!redisClient) return memoryFallback;
  return new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix,
    points,
    duration,
    blockDuration,
    insuranceLimiter: memoryFallback, // used automatically if Redis is unreachable
  });
}

export const authLimiter = makeLimiter('rl_auth', 5, 15 * 60, 15 * 60);
export const apiLimiter = makeLimiter('rl_api', 100, 60, 60);
export const uploadLimiter = makeLimiter('rl_upload', 10, 60 * 60, 60 * 60);

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
 * Rate limit by merchant ID for uploads. Guards against abuse (a compromised account or
 * runaway script hammering R2 storage), not normal usage — 10/hour was never actually wired
 * up before now, despite being defined.
 */
export async function checkUploadLimit(merchantId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    await uploadLimiter.consume(merchantId);
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
