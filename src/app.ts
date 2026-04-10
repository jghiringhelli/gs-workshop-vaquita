import express from 'express';
import type { DB } from './db/db';
import { createUsersRepo } from './repositories/usersRepo';
import { createTandasRepo } from './repositories/tandasRepo';
import { createParticipantsRepo } from './repositories/participantsRepo';
import { createContributionsRepo } from './repositories/contributionsRepo';
import { createUsersService } from './services/usersService';
import { createTandasService } from './services/tandasService';
import { createAuthRouter } from './routes/auth';
import { createUsersRouter } from './routes/users';
import { createTandasRouter } from './routes/tandas';
import { errorHandler } from './middleware/errorHandler';

export function createApp(db: DB) {
  const app = express();
  app.use(express.json());

  // ── Repositories ────────────────────────────────────────────────────────
  const usersRepo = createUsersRepo(db);
  const tandasRepo = createTandasRepo(db);
  const participantsRepo = createParticipantsRepo(db);
  const contributionsRepo = createContributionsRepo(db);

  // ── Services ────────────────────────────────────────────────────────────
  const usersService = createUsersService(usersRepo);
  const tandasService = createTandasService(tandasRepo, participantsRepo, contributionsRepo, usersRepo);

  // ── Routes ──────────────────────────────────────────────────────────────
  app.use('/api/auth', createAuthRouter(usersService));
  app.use('/api/users', createUsersRouter(usersService));
  app.use('/api/tandas', createTandasRouter(tandasService));

  // ── Centralized error handler (must be last) ─────────────────────────────
  app.use(errorHandler);

  return app;
}
