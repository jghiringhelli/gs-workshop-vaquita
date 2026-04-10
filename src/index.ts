import { createApp } from './app';
import { createDatabase } from './db/database';
import { config } from './config';
import { logger } from './logger';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './users/user.service';
import { createUserRouter } from './users/user.routes';
import { ParticipantRepository } from './repositories/participant.repository';
import { ParticipantService } from './participants/participant.service';
import { createParticipantRouter } from './participants/participant.routes';
import { TandaRepository } from './repositories/tanda.repository';
import { TandaService } from './tandas/tanda.service';
import { createTandaRouter } from './tandas/tanda.routes';
import { ContributionRepository } from './repositories/contribution.repository';
import { ContributionService } from './contributions/contribution.service';
import { createContributionRouter } from './contributions/contribution.routes';

const db = createDatabase();

const userRepository = new UserRepository(db);
const userService = new UserService(userRepository);

const participantRepository = new ParticipantRepository(db);
const tandaRepository = new TandaRepository(db);
const tandaService = new TandaService(tandaRepository, participantRepository, userRepository, {
  minParticipantsToStart: config.minParticipantsToStart,
});
const participantService = new ParticipantService(
  tandaRepository,
  participantRepository,
  userRepository,
  { maxParticipants: config.maxParticipants },
);
const contributionRepository = new ContributionRepository(db);
const contributionService = new ContributionService(
  tandaRepository,
  participantRepository,
  contributionRepository,
);

const app = createApp([
  { path: '/api/users', router: createUserRouter(userService) },
  { path: '/api/tandas', router: createTandaRouter(tandaService) },
  { path: '/api/tandas', router: createParticipantRouter(participantService) },
  { path: '/api/tandas', router: createContributionRouter(contributionService) },
]);

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => {
    db.close();
    logger.info('Server closed');
    process.exit(0);
  });
});
