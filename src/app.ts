import express from 'express';
import { NotFoundError } from './errors/customErrors';
import { errorHandler } from './middleware/errorHandler';
import { getDatabase } from './db/database';
import { UserRepository } from './repositories/userRepository';
import { TandaRepository } from './repositories/tandaRepository';
import { ParticipantRepository } from './repositories/participantRepository';
import { ContributionRepository } from './repositories/contributionRepository';
import { UserService } from './services/userService';
import { TandaService } from './services/tandaService';
import { createUserRoutes } from './routes/userRoutes';
import { createTandaRoutes } from './routes/tandaRoutes';

export function createApp(): express.Express {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const db = getDatabase();

  const userRepository = new UserRepository(db);
  const tandaRepository = new TandaRepository(db);
  const participantRepository = new ParticipantRepository(db);
  const contributionRepository = new ContributionRepository(db);

  const userService = new UserService(userRepository);
  const tandaService = new TandaService(
    tandaRepository,
    participantRepository,
    contributionRepository,
    userRepository
  );

  app.use('/api/users', createUserRoutes(userService));
  app.use('/api/tandas', createTandaRoutes(tandaService));

  app.use((req, _res, next) => {
    next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  app.use(errorHandler);

  return app;
}
