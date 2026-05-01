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

async function dbConnect() {
  // Return cached connection immediately
  if (cached.conn) return cached.conn;

  // If a connection attempt is already in flight, wait for it
  if (!cached.promise) {
    const raw = process.env.MONGODB_URI!.trim();
    let uri = getEncodedURI(raw);

    if (!uri.includes('appName=')) {
      uri += (uri.includes('?') ? '&' : '?') + 'appName=VercelApp';
    }

    cached.promise = mongoose.connect(uri, {
      dbName: 'lineoa',
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 0,
    }).then((m) => {
      console.log('[DB] New connection established.');
      return m;
    }).catch((err) => {
      // Reset on failure so the next request can retry
      cached.promise = null;
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
