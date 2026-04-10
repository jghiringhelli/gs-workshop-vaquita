import express from 'express';
import { userRouter } from './modules/users/user.router';
import { tandaRouter } from './modules/tandas/tanda.router';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/users', userRouter);
  app.use('/api/tandas', tandaRouter);

  app.use(errorHandler);
  return app;
}
