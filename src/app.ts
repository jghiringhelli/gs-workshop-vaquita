import express from 'express';
import Database from 'better-sqlite3';
import { createDatabase } from './db/database';
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

export function createApp(db?: Database.Database) {
  const database = db ?? createDatabase();

  const userRepo = new UserRepository(database);
  const tandaRepo = new TandaRepository(database);
  const participantRepo = new ParticipantRepository(database);
  const contributionRepo = new ContributionRepository(database);

  const userService = new UserService(userRepo);
  const tandaService = new TandaService(tandaRepo, participantRepo, contributionRepo, userRepo);
  const contributionService = new ContributionService(contributionRepo, participantRepo, tandaRepo);

  const app = express();
  app.use(express.json());

  app.use('/api/users', createUsersRouter(userService));
  app.use('/api/tandas', createTandasRouter(tandaService, contributionService));

  app.use(errorHandler);

  return app;
}
