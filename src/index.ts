import { createApp } from './app';
import { createDatabase } from './db/database';
import { config } from './config';
import { logger } from './logger';

const db = createDatabase();
const app = createApp();

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => {
    db.close();
    logger.info('Server closed');
    process.exit(0);
  });
});
