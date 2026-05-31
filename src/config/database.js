import mongoose from 'mongoose';
import { env } from './env.js';
import logger from '../utils/logger.js';

const MAX_RETRIES = 5;
let retries = 0;

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    retries = 0;
    return conn;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);

    if (retries < MAX_RETRIES) {
      retries += 1;
      const delay = Math.pow(2, retries) * 1000;
      logger.info(`Retrying MongoDB connection in ${delay}ms... (attempt ${retries}/${MAX_RETRIES})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB();
    }

    logger.error('Max MongoDB connection retries reached. Exiting...');
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting to reconnect...');
  connectDB();
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err.message}`);
});

export default connectDB;
