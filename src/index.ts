import express from 'express';
import { config } from './config.js';
import { getDatabase } from './db/database.js';
import { runMigrations } from './db/schema.js';
import { UserRepository } from './repositories/UserRepository.js';
import { TandaRepository } from './repositories/TandaRepository.js';
import { ParticipantRepository } from './repositories/ParticipantRepository.js';
import { ContributionRepository } from './repositories/ContributionRepository.js';
import { UserService } from './services/UserService.js';
import { TandaService } from './services/TandaService.js';
import { createUserRouter } from './routes/users.js';
import { createTandaRouter } from './routes/tandas.js';
import { errorHandler } from './middleware/errorHandler.js';

/**
 * Construct and configure the Express application with injected services.
 * @param userService - Handles user business logic
 * @param tandaService - Handles tanda lifecycle and contributions
 * @returns Configured Express Application
 */
export function createApp(
  userService: UserService,
  tandaService: TandaService,
): express.Application {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/users', createUserRouter(userService));
  app.use('/api/tandas', createTandaRouter(tandaService));

  app.use(errorHandler);

  return app;
}

if (process.env['NODE_ENV'] !== 'test') {
  runMigrations();
  const db = getDatabase();
  const userRepo = new UserRepository(db);
  const tandaRepo = new TandaRepository(db);
  const participantRepo = new ParticipantRepository(db);
  const contributionRepo = new ContributionRepository(db);
  const userService = new UserService(userRepo);
  const tandaService = new TandaService(tandaRepo, participantRepo, contributionRepo, userRepo);
  const app = createApp(userService, tandaService);

  app.listen(config.port, () => {
    console.log(`Tanda API listening on http://localhost:${config.port}`);
  });
}
