import express from 'express';
import Database from 'better-sqlite3';
import { runMigrations } from './db/schema';
import { setDb } from './db/database';
import { createAuthRouter } from './routes/auth';
import { createUsersRouter } from './routes/users';
import { createTandasRouter } from './routes/tandas';
import { errorHandler } from './middleware/errorHandler';

export function createApp(db?: Database.Database): express.Application {
  const app = express();
  app.use(express.json());

  if (db) {
    setDb(db);
    runMigrations(db);
  }

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/users', createUsersRouter(db));
  app.use('/api/tandas', createTandasRouter(db));

  app.use(errorHandler);

  return app;
}
