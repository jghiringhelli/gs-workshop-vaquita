import { createApp } from './app';
import { config } from './config';
import { createDatabase } from './db/database';
import { SqliteUserRepository } from './modules/users/SqliteUserRepository';
import { UserService } from './modules/users/UserService';
import { SqliteTandaRepository } from './modules/tandas/SqliteTandaRepository';
import { SqliteParticipantRepository } from './modules/participants/SqliteParticipantRepository';
import { SqliteContributionRepository } from './modules/contributions/SqliteContributionRepository';
import { TandaService } from './modules/tandas/TandaService';

const db = createDatabase(config.dbPath);

const userRepo = new SqliteUserRepository(db);
const tandaRepo = new SqliteTandaRepository(db);
const participantRepo = new SqliteParticipantRepository(db);
const contributionRepo = new SqliteContributionRepository(db);

const userService = new UserService(userRepo);
const tandaService = new TandaService(tandaRepo, participantRepo, contributionRepo, userRepo);

const app = createApp({ userService, tandaService });

app.listen(config.port, () => {
  console.log(`Tanda API listening on port ${config.port}`);
});
