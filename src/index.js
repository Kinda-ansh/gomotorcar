import config from './config';
import logger from './core/logger';
import { createServer } from './core/server';
import connectDB from './utils/db';
import dotenv from 'dotenv';

dotenv.config();

const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();

    const port = config.port || 8080;
    const server = createServer();

    server.listen(port, () => {
      logger.info(`API server running on port ${port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
