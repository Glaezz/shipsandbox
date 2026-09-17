import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns/promises';

dotenv.config();

console.log('Testing connection to:', process.env.MONGODB_URI);
dns.setServers(["1.1.1.1", "1.0.0.1"]);
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Berhasil Terhubung!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ MongoDB Gagal Terhubung:', err.message);
    process.exit(1);
   });