import express from 'express';
import usersRouter from './routes/users';
import tandasRouter from './routes/tandas';
import { errorHandler } from './routes/middleware';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.use('/api/users', usersRouter);
  app.use('/api/tandas', tandasRouter);

  // Must be last — catches AppError thrown in any route
  app.use(errorHandler);

  return app;
}
