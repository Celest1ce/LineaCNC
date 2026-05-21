import app from './app.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { initDatabase } from './lib/prisma.js';

async function startServer() {
  try {
    // Initialize database connection
    await initDatabase();

    // Start server
    app.listen(env.PORT, () => {
      logger.info(`✓ Server running on port ${env.PORT}`);
      logger.info(`✓ Environment: ${env.NODE_ENV}`);
      if (env.NODE_ENV !== 'production') {
        logger.info(`✓ API available at http://localhost:${env.PORT}/api`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
