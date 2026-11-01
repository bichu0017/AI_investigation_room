const mongoose = require('mongoose');

async function connectMongo() {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const mongoUri = process.env.MONGODB_URI || (
    process.env.NODE_ENV === 'production' ? null : 'mongodb://127.0.0.1:27017/ai_mystery_room'
  );

  if (!mongoUri) {
    throw new Error('MONGODB_URI must be configured in production.');
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Could not connect to MongoDB: ${error.message}`, { cause: error });
    }

    console.warn('MongoDB unavailable, falling back to in-memory case storage:', error.message);
    return null;
  }
}

module.exports = { connectMongo };
