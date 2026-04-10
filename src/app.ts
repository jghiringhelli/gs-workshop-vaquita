import express from 'express';
import { getDatabase } from './db/database';
import { UserRepository } from './repositories/UserRepository';
import { TandaRepository } from './repositories/TandaRepository';
import { ParticipantRepository } from './repositories/ParticipantRepository';
import { ContributionRepository } from './repositories/ContributionRepository';
import { UserService } from './services/UserService';
import { TandaService } from './services/TandaService';
import { ContributionService } from './services/ContributionService';
import { createUsersRouter } from './routes/users.router';
import { createTandasRouter } from './routes/tandas.router';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();
  app.use(express.json());

  const db = getDatabase();

  // Repositories — injected into services (Dependency Inversion)
  const userRepo = new UserRepository(db);
  const tandaRepo = new TandaRepository(db);
  const participantRepo = new ParticipantRepository(db);
  const contributionRepo = new ContributionRepository(db);

  // Services — depend on repository abstractions (interfaces)
  const userService = new UserService(userRepo);
  const tandaService = new TandaService(tandaRepo, participantRepo, userRepo);
  const contributionService = new ContributionService(contributionRepo, participantRepo, tandaRepo);

  // Routes — depend on services, not repositories
  app.use('/api/users', createUsersRouter(userService));
  app.use('/api/tandas', createTandasRouter(tandaService, contributionService));

  // Centralized error handling
  app.use(errorHandler);

  return app;
}
