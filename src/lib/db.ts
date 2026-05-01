import mongoose from 'mongoose';

async function dbConnect() {
  // Already connected — reuse
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  // Currently connecting — wait for it
  if (mongoose.connection.readyState === 2) {
    await new Promise((res) => mongoose.connection.once('connected', res));
    return mongoose.connection;
  }

  // Fresh connection
  const raw = process.env.MONGODB_URI!.trim();
  let uri = getEncodedURI(raw);

  // Add appName for easier debugging in Atlas console
  if (!uri.includes('appName=')) {
    uri += (uri.includes('?') ? '&' : '?') + 'appName=VercelApp';
  }

  return mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 0,
  });
}

function getEncodedURI(raw: string): string {
  // Parse out credentials from mongodb+srv URI and encode the password
  // Handles both mongodb:// and mongodb+srv://
  const match = raw.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
  if (!match) return raw;
  const [, scheme, user, pass, rest] = match;
  return `${scheme}${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${rest}`;
}

export default dbConnect;
