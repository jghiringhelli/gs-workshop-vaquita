import express, { type Request, type Response, type NextFunction } from 'express';
import { ZodError } from 'zod';
import type Database from 'better-sqlite3';
import { createUsersRepository } from './repositories/users.repository';
import { createTandasRepository } from './repositories/tandas.repository';
import { createParticipantsRepository } from './repositories/participants.repository';
import { createContributionsRepository } from './repositories/contributions.repository';
import { createUsersService } from './services/users.service';
import { createTandasService } from './services/tandas.service';
import { createContributionsService } from './services/contributions.service';
import { createUsersRouter } from './routes/users.routes';
import { createTandasRouter } from './routes/tandas.routes';
import { AppError } from './errors';

export function createApp(db: Database.Database) {
  const app = express();
  app.use(express.json());

  const usersRepo = createUsersRepository(db);
  const tandasRepo = createTandasRepository(db);
  const participantsRepo = createParticipantsRepository(db);
  const contributionsRepo = createContributionsRepository(db);

  const usersService = createUsersService(usersRepo);
  const tandasService = createTandasService(tandasRepo, participantsRepo, usersRepo);
  const contributionsService = createContributionsService(tandasRepo, participantsRepo, contributionsRepo);

  app.use('/api/users', createUsersRouter(usersService));
  app.use('/api/tandas', createTandasRouter(tandasService, contributionsService));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
