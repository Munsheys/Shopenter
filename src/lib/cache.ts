import Redis from 'ioredis';

let redisClient: Redis | null = null;

// Initialize Redis if available
export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;

  if (!redisClient) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        enableOfflineQueue: false,
      });

      redisClient.on('error', (err) => {
        console.error('[Redis] Connection error:', err.message);
      });
    } catch (err) {
      console.warn('[Cache] Redis unavailable, using memory-only cache');
      return null;
    }
  }

  return redisClient;
}

// In-memory fallback cache for when Redis is unavailable
const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();

interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 300)
}

/**
 * Get value from cache (Redis → Memory → null)
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();

  try {
    if (redis) {
      const cached = await redis.getex(key, 'EX', '300'); // Refresh on access
      if (cached) return JSON.parse(cached) as T;
    } else {
      // Memory fallback
      const entry = memoryCache.get(key);
      if (entry && entry.expiresAt > Date.now()) {
        return entry.value as T;
      }
      memoryCache.delete(key);
    }
  } catch (err) {
    console.error(`[Cache] Get error for ${key}:`, err);
  }

  return null;
}

/**
 * Set value in cache with TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const ttl = options.ttl || 300;

  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.setex(key, ttl, JSON.stringify(value));
    } else {
      // Memory fallback
      memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttl * 1000,
      });
    }
  } catch (err) {
    console.error(`[Cache] Set error for ${key}:`, err);
  }
}

/**
 * Delete key from cache
 */
export async function cacheDel(key: string | string[]): Promise<void> {
  try {
    const redis = getRedisClient();
    if (redis) {
      if (Array.isArray(key)) {
        if (key.length > 0) await redis.del(...key);
      } else {
        await redis.del(key);
      }
    } else {
      // Memory fallback
      if (Array.isArray(key)) {
        key.forEach((k) => memoryCache.delete(k));
      } else {
        memoryCache.delete(key);
      }
    }
  } catch (err) {
    console.error('[Cache] Delete error:', err);
  }
}

/**
 * Clear all cache (use with caution)
 */
export async function cacheClear(): Promise<void> {
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.flushdb();
    } else {
      memoryCache.clear();
    }
  } catch (err) {
    console.error('[Cache] Clear error:', err);
  }
}

/**
 * Invalidate merchant cache on data change
 */
export async function invalidateMerchantCache(merchantId: string): Promise<void> {
  const keysToInvalidate = [
    `merchant:${merchantId}`,
    `merchant:${merchantId}:settings`,
    `merchant:${merchantId}:products`,
    `merchant:${merchantId}:customers`,
    `merchant:${merchantId}:stats`,
  ];

  await cacheDel(keysToInvalidate);
}

/**
 * Cache wrapper for frequently accessed data
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  // Fetch and cache
  const value = await fetcher();
  await cacheSet(key, value, options);
  return value;
}
