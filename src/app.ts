import express from 'express';
import userRouter from './modules/users/user.routes';
import tandaRouter from './modules/tandas/tanda.routes';
import { errorHandler } from './middleware/errorHandler';

/**
 * Creates and configures the Express application.
 *
 * Exported as a factory (not a live server) so tests can import
 * the app without triggering `listen`.
 *
 * @returns Configured Express application instance.
 */
function createApp(): express.Application {
  const app = express();

  // Parse JSON request bodies.
  app.use(express.json());

  // Health check — no auth required.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
  });

  // Feature routers.
  app.use('/api/users', userRouter);
  app.use('/api/tandas', tandaRouter);

  // Global error handler — must be registered last.
  app.use(errorHandler);

  return app;
}

export default createApp();
