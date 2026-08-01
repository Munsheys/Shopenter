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

// Prevent concurrent connection attempts
let connectAttempts = 0;
const MAX_CONNECT_ATTEMPTS = 3;

async function dbConnect() {
  // Return cached connection immediately
  if (cached.conn) {
    connectionMetrics.lastUsedAt = Date.now();
    return cached.conn;
  }

  // If a connection attempt is already in flight, wait for it
  if (!cached.promise) {
    // Safety: Prevent connection storms
    if (connectAttempts >= MAX_CONNECT_ATTEMPTS) {
      console.error('[DB] Max connection attempts exceeded - possible connection leak');
      throw new Error('Database connection pool exhausted');
    }

    connectAttempts++;
    const raw = process.env.MONGODB_URI!.trim();
    let uri = getEncodedURI(raw);

    if (!uri.includes('appName=')) {
      uri += (uri.includes('?') ? '&' : '?') + 'appName=VercelApp';
    }

    cached.promise = mongoose.connect(uri, {
      dbName: 'lineoa',
      // Serverless-optimized pool settings for M0 (3 connection limit)
      maxPoolSize: 2, // Critical: Max 2 connections per instance
      minPoolSize: 0, // Allow full cleanup
      maxIdleTimeMS: 30000, // Close idle connections quickly
      serverSelectionTimeoutMS: 5000, // Fail fast
      socketTimeoutMS: 30000, // Prevent hanging sockets
      waitQueueTimeoutMS: 5000, // Critical: Fail fast on queue (was 10s, reduced for M0)
      connectTimeoutMS: 10000,
      retryWrites: true,
      // CRITICAL for serverless: Don't create new connections on every request
      replicaSet: undefined, // M0 doesn't support replica sets
    }).then((m) => {
      connectAttempts = 0; // Reset on success
      connectionMetrics.establishedAt = Date.now();
      connectionMetrics.lastUsedAt = Date.now();

      // Actual live pool size isn't exposed on the typed MongoClient API — maxPoolSize (2)
      // is the configured ceiling, which is what matters for the M0 3-connection limit.
      connectionMetrics.poolSize = 2;
      console.log('[DB] Connected (max pool: 2, M0 limit: 3/3)');
      return m;
    }).catch((err) => {
      connectAttempts--; // Decrement on failure
      cached.promise = null;
      console.error('[DB] Connection failed:', err.message);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    connectionMetrics.lastUsedAt = Date.now();
    return cached.conn;
  } catch (err) {
    // Reset promise on await failure too
    cached.promise = null;
    throw err;
  }
}

// Export metrics for monitoring (optional Sentry integration)
export { connectionMetrics };

export default dbConnect;
