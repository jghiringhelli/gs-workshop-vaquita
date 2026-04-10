import express from 'express';
import Database from 'better-sqlite3';
import { createUserRepository } from './repositories/userRepository';
import { createTandaRepository } from './repositories/tandaRepository';
import { createParticipantRepository } from './repositories/participantRepository';
import { createContributionRepository } from './repositories/contributionRepository';
import { createUserService } from './services/userService';
import { createTandaService } from './services/tandaService';
import { createContributionService } from './services/contributionService';
import { createUserRoutes } from './routes/userRoutes';
import { createTandaRoutes } from './routes/tandaRoutes';
import { createAuthRoutes } from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(db: Database.Database) {
  const userRepo = createUserRepository(db);
  const tandaRepo = createTandaRepository(db);
  const participantRepo = createParticipantRepository(db);
  const contributionRepo = createContributionRepository(db);

  const userService = createUserService(userRepo);
  const tandaService = createTandaService(tandaRepo, participantRepo, userRepo);
  const contributionService = createContributionService(contributionRepo, participantRepo, tandaRepo);

  const app = express();
  app.use(express.json());

  app.use('/api/users', createUserRoutes(userService));
  app.use('/api/auth', createAuthRoutes(userService));
  app.use('/api/tandas', createTandaRoutes(tandaService, contributionService));

  app.use(errorHandler);

  return app;
}
