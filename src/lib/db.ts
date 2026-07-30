import mongoose from 'mongoose';

// --- Globals for connection caching ---
declare global {
  // eslint-disable-next-line no-var
  var __mongoose_cache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

if (!global.__mongoose_cache) {
  global.__mongoose_cache = { conn: null, promise: null };
}

const cached = global.__mongoose_cache;

function getEncodedURI(raw: string): string {
  const match = raw.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
  if (!match) return raw;
  const [, scheme, user, pass, rest] = match;
  return `${scheme}${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${rest}`;
}

// Track connection state and timing for monitoring
const connectionMetrics = {
  establishedAt: 0,
  lastUsedAt: 0,
  poolSize: 0,
};

async function dbConnect() {
  // Return cached connection immediately
  if (cached.conn) {
    connectionMetrics.lastUsedAt = Date.now();
    return cached.conn;
  }

  // If a connection attempt is already in flight, wait for it
  if (!cached.promise) {
    const raw = process.env.MONGODB_URI!.trim();
    let uri = getEncodedURI(raw);

    if (!uri.includes('appName=')) {
      uri += (uri.includes('?') ? '&' : '?') + 'appName=VercelApp';
    }

    cached.promise = mongoose.connect(uri, {
      dbName: 'lineoa',
      // Serverless-optimized pool settings
      maxPoolSize: 2, // Reduced from 10: each instance needs only 1-2 connections
      minPoolSize: 0, // Allow pool to close on idle (serverless-friendly)
      maxIdleTimeMS: 30000, // Close idle connections after 30s
      serverSelectionTimeoutMS: 5000, // Fail fast on unavailable servers
      socketTimeoutMS: 30000, // Shorter socket timeout for serverless
      waitQueueTimeoutMS: 10000, // Queue timeout to prevent hanging requests
      connectTimeoutMS: 10000,
      retryWrites: true, // Handle transient network errors
    }).then((m) => {
      connectionMetrics.establishedAt = Date.now();
      connectionMetrics.lastUsedAt = Date.now();
      connectionMetrics.poolSize = m.connection.getClient().topology?.s?.pool?.totalConnectionCount || 2;
      console.log('[DB] Connection established (serverless-optimized pool)');
      return m;
    }).catch((err) => {
      // Reset on failure so the next request can retry
      cached.promise = null;
      console.error('[DB] Connection failed:', err.message);
      throw err;
    });
  }

  cached.conn = await cached.promise;
  connectionMetrics.lastUsedAt = Date.now();
  return cached.conn;
}

// Export metrics for monitoring (optional Sentry integration)
export { connectionMetrics };

export default dbConnect;
