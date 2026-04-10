import express from 'express';
import Database from 'better-sqlite3';
import { errorHandler } from './shared/middleware/errorHandler';
import { SqliteUserRepository } from './modules/users/repository/SqliteUserRepository';
import { UserService } from './modules/users/service/UserService';
import { createUserRouter } from './modules/users/routes/userRoutes';

/**
 * Creates and configures the Express application.
 * @param db - SQLite database instance.
 * @returns Configured Express app.
 */
export function createApp(db: Database.Database) {
  const app = express();
  app.use(express.json());

  const userRepo = new SqliteUserRepository(db);
  const userService = new UserService(userRepo);
  app.use('/api/users', createUserRouter(userService));

  app.use(errorHandler);
  return app;
}
