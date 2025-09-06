import mongoose from 'mongoose';
import logger from '../core/logger';
import config from '../config';

const connectDB = async (retryCount = 0) => {
  const maxRetries = 5;
  const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s

  try {
    // MongoDB connection options for Mongoose 8.x
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      // Note: bufferCommands and bufferMaxEntries are not supported in newer Mongoose versions
      // useNewUrlParser and useUnifiedTopology are defaults in Mongoose 8.x
    };

    await mongoose.connect(config.mongoose.url, options);
    logger.info('Connected to MongoDB successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (err) {
    logger.error(`Error connecting to MongoDB (attempt ${retryCount + 1}/${maxRetries + 1}):`, err.message);

    if (retryCount < maxRetries) {
      logger.info(`Retrying connection in ${retryDelay}ms...`);
      setTimeout(() => {
        connectDB(retryCount + 1);
      }, retryDelay);
    } else {
      logger.error('Max retry attempts reached. Exiting...');
      process.exit(1); // Exit process with failure after all retries
    }
  }
};

export default connectDB;
