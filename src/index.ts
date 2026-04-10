import { createApp } from './app';
import { createDatabase } from './db/database';
import { config } from './config';
import { logger } from './logger';
import { UserRepository } from './users/user.repository';
import { UserService } from './users/user.service';
import { createUserRouter } from './users/user.routes';
import { ParticipantRepository } from './participants/participant.repository';
import { TandaRepository } from './tandas/tanda.repository';
import { TandaService } from './tandas/tanda.service';
import { createTandaRouter } from './tandas/tanda.routes';

const db = createDatabase();

const userRepository = new UserRepository(db);
const userService = new UserService(userRepository);

const participantRepository = new ParticipantRepository(db);
const tandaRepository = new TandaRepository(db);
const tandaService = new TandaService(tandaRepository, participantRepository, userRepository);

const app = createApp([
  { path: '/api/users', router: createUserRouter(userService) },
  { path: '/api/tandas', router: createTandaRouter(tandaService) },
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
