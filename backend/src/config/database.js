import mongoose from 'mongoose';
import * as models from '../models/index.js';
// Never log raw driver errors: they can contain the connection URI.
mongoose.connection.on('connected', () => console.info('MongoDB connected'));
mongoose.connection.on('disconnected', () =>
  console.info('MongoDB disconnected'),
);
mongoose.connection.on('error', () =>
  console.error('MongoDB connection error'),
);
export async function connectDatabase(uri) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      autoIndex: false,
      bufferCommands: false,
    });
  } catch {
    throw new Error(
      'Unable to connect to MongoDB; check configuration and availability',
    );
  }
}
export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export async function createModelIndexes() {
  // autoIndex is disabled; create declared indexes without dropping existing ones.
  for (const model of Object.values(models)) await model.createIndexes();
}
