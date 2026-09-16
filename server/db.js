import mongoose from "mongoose";

let cached = globalThis.__shipSandboxMongo;
if (!cached) cached = globalThis.__shipSandboxMongo = { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false })
      .then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}