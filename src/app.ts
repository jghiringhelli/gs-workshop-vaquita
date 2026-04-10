import express, { type Request, type Response, type NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { createUserRouter } from './users/routes';
import { createTandaRouter } from './tandas/routes';
import { UserService } from './users/service';
import { TandaService } from './tandas/service';
import { ContributionService } from './tandas/contribution.service';
import { SqliteUserRepository } from './repositories/user.repository';
import { SqliteTandaRepository } from './repositories/tanda.repository';
import { SqliteParticipantRepository } from './repositories/participant.repository';
import { SqliteContributionRepository } from './repositories/contribution.repository';
import { AppError } from './errors';

/**
 * Creates and configures the Express application with all routes wired up.
 * @param db - SQLite Database instance (injected for testability).
 * @returns Configured Express application.
 */
export function createApp(db: Database.Database): express.Application {
  const app = express();
  app.use(express.json());

  // Repositories
  const userRepo = new SqliteUserRepository(db);
  const tandaRepo = new SqliteTandaRepository(db);
  const participantRepo = new SqliteParticipantRepository(db);
  const contributionRepo = new SqliteContributionRepository(db);

  // Services
  const userService = new UserService(userRepo);
  const tandaService = new TandaService(tandaRepo, participantRepo, userRepo);
  const contributionService = new ContributionService(contributionRepo, participantRepo, tandaRepo);

  // Routes
  app.use('/api/users', createUserRouter(userService));
  app.use('/api/tandas', createTandaRouter(tandaService, contributionService));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', version: '1.0.0' });
  });

  // Global error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.httpStatus).json({ errors: [{ code: err.code, message: err.message }] });
      return;
    }
    console.error(err);
    res.status(500).json({ errors: [{ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }] });
  });

  return app;
}
