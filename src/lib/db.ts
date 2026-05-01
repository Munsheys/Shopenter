import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = MONGODB_URI.trim();
    const opts = {
      serverSelectionTimeoutMS: 10000,
    };
    console.log("Connecting to MongoDB...");
    cached.promise = mongoose.connect(uri, opts)
      .then((mongoose) => {
        console.log("MongoDB Connected Successfully");
        return mongoose;
      })
      .catch((err) => {
        console.error("MongoDB Connection Failed:", err.message);
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
