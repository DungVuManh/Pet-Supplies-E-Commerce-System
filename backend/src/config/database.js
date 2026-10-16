import mongoose from 'mongoose';
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
