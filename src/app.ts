import express from 'express';
import { NotFoundError } from './errors/customErrors';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): express.Express {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes will be added here as we build them
  // app.use('/api/users', userRoutes);
  // app.use('/api/tandas', tandaRoutes);

  app.use((req, _res, next) => {
    next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  app.use(errorHandler);

  return app;
}
