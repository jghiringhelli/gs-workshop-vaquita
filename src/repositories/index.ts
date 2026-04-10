import Database from 'better-sqlite3';
import { UserRepository } from './user';
import { TandaRepository } from './tanda';
import { ParticipantRepository } from './participant';
import { ContributionRepository } from './contribution';

export { UserRepository, TandaRepository, ParticipantRepository, ContributionRepository };
export type { User } from './user';
export type { Tanda } from './tanda';
export type { Participant } from './participant';
export type { Contribution } from './contribution';

export class RepositoryFactory {
  private db: Database.Database;
  private userRepo: UserRepository;
  private tandaRepo: TandaRepository;
  private participantRepo: ParticipantRepository;
  private contributionRepo: ContributionRepository;

  constructor(db: Database.Database) {
    this.db = db;
    this.userRepo = new UserRepository(db);
    this.tandaRepo = new TandaRepository(db);
    this.participantRepo = new ParticipantRepository(db);
    this.contributionRepo = new ContributionRepository(db);
  }

  getUsers(): UserRepository {
    return this.userRepo;
  }

  getTandas(): TandaRepository {
    return this.tandaRepo;
  }

  getParticipants(): ParticipantRepository {
    return this.participantRepo;
  }

  getContributions(): ContributionRepository {
    return this.contributionRepo;
  }
}
