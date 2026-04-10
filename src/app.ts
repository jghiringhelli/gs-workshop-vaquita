import express from 'express';
import Database from 'better-sqlite3';
import { errorHandler } from './shared/middleware/errorHandler';
import { SqliteUserRepository } from './modules/users/repository/SqliteUserRepository';
import { UserService } from './modules/users/service/UserService';
import { createUserRouter } from './modules/users/routes/userRoutes';
import { SqliteTandaRepository } from './modules/tandas/repository/SqliteTandaRepository';
import { SqliteContributionRepository } from './modules/tandas/repository/SqliteContributionRepository';
import { TandaService } from './modules/tandas/service/TandaService';
import { ContributionService } from './modules/tandas/service/ContributionService';
import { AdvanceService } from './modules/tandas/service/AdvanceService';
import { createTandaRouter } from './modules/tandas/routes/tandaRoutes';

/**
 * Creates and configures the Express application.
 * @param db - SQLite database instance.
 * @returns Configured Express app.
 */
export function createApp(db: Database.Database) {
  const app = express();
  app.use(express.json());

  app.get('/', (_req, res) => res.json({ status: 'ok', api: '/api/users, /api/tandas' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  const userRepo= new SqliteUserRepository(db);
  const userService = new UserService(userRepo);
  app.use('/api/users', createUserRouter(userService));

  const tandaRepo = new SqliteTandaRepository(db);
  const tandaService = new TandaService(tandaRepo, userRepo);
  const contributionRepo = new SqliteContributionRepository(db);
  const contributionService = new ContributionService(tandaRepo, contributionRepo);
  const advanceService = new AdvanceService(tandaRepo, contributionRepo);
  app.use('/api/tandas', createTandaRouter(tandaService, contributionService, advanceService));

  app.use(errorHandler);
  return app;
}
