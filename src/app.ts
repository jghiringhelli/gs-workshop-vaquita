import express from 'express';
import { getDatabase } from './shared/database';
import { errorHandler } from './shared/middleware/errorHandler';

import { createUsersRepository } from './modules/users/users.repository';
import { createUsersService } from './modules/users/users.service';
import { createUsersRouter } from './modules/users/users.routes';

import { createTandasRepository } from './modules/tandas/tandas.repository';
import { createParticipantsRepository } from './modules/tandas/participants.repository';
import { createContributionsRepository } from './modules/tandas/contributions.repository';
import { createTandasService } from './modules/tandas/tandas.service';
import { createTandasRouter } from './modules/tandas/tandas.routes';

/**
 * Compose and return the Express application.
 * Exported separately from server startup to enable supertest integration tests.
 */
export const createApp = () => {
  const db = getDatabase();

  const usersRepo = createUsersRepository(db);
  const usersService = createUsersService(usersRepo);
  const usersRouter = createUsersRouter(usersService);

  const tandasRepo = createTandasRepository(db);
  const participantsRepo = createParticipantsRepository(db);
  const contributionsRepo = createContributionsRepository(db);
  const tandasService = createTandasService(tandasRepo, participantsRepo, contributionsRepo);
  const tandasRouter = createTandasRouter(tandasService);

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/users', usersRouter);
  app.use('/api/tandas', tandasRouter);

  app.use(errorHandler);

  return app;
};
