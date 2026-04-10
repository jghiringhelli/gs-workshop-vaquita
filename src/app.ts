import express from 'express';
import { getDb } from './shared/database/index.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { UserRepository } from './modules/users/user.repository.js';
import { UserService } from './modules/users/user.service.js';
import { buildUserRouter } from './modules/users/user.routes.js';
import { TandaRepository } from './modules/tandas/tanda.repository.js';
import { ParticipantRepository } from './modules/tandas/participant.repository.js';
import { ContributionRepository } from './modules/tandas/contribution.repository.js';
import { TandaService } from './modules/tandas/tanda.service.js';
import { buildTandaRouter } from './modules/tandas/tanda.routes.js';

/**
 * Assembles and returns the Express application.
 * Wires all repositories, services, and routers.
 * @returns Configured Express app
 */
export function createApp() {
  const app = express();
  app.use(express.json());

  // Infrastructure
  const db = getDb();

  // User module
  const userRepo = new UserRepository(db);
  const userService = new UserService(userRepo);

  // Tanda module
  const tandaRepo = new TandaRepository(db);
  const participantRepo = new ParticipantRepository(db);
  const contributionRepo = new ContributionRepository(db);
  const tandaService = new TandaService(tandaRepo, participantRepo, contributionRepo, userRepo);

  // Routes
  app.use('/api/users', buildUserRouter(userService));
  app.use('/api/tandas', buildTandaRouter(tandaService));

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

