import pino from 'pino';
import { config } from './config';

/**
 * Application-wide structured logger.
 * - Silent in test environments to keep test output clean.
 * - Pretty-printed in development.
 * - Structured JSON in production.
 */
export const logger = pino({
  level: config.nodeEnv === 'test' ? 'silent' : 'info',
  ...(config.nodeEnv === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
});
