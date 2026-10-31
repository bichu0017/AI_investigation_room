const dns = require('dns');
const mongoose = require('mongoose');

// On Windows, local ISP/router DNS often refuses SRV queries (querySrv ECONNREFUSED) for mongodb+srv://
if (process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (err) {
    // Keep default resolver if restricted
  }
}

async function connectMongo() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_mystery_room';

  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  // Ensure DNS is configured before connecting
  if (mongoUri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {}
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.warn('MongoDB unavailable, falling back to in-memory case storage:', error.message);
    return null;
  }
}

module.exports = { connectMongo };
