import Database from 'better-sqlite3';
import { RepositoryFactory } from '../repositories';
import { UserService } from './user';
import { TandaService } from './tanda';
import { ParticipantService } from './participant';
import { ContributionService } from './contribution';

export { UserService, TandaService, ParticipantService, ContributionService };

export class ServiceFactory {
  private userService: UserService;
  private tandaService: TandaService;
  private participantService: ParticipantService;
  private contributionService: ContributionService;

  constructor(db: Database.Database) {
    const repos = new RepositoryFactory(db);

    this.userService = new UserService(repos.getUsers());
    this.tandaService = new TandaService(
      repos.getTandas(),
      repos.getParticipants(),
      repos.getContributions(),
      repos.getUsers()
    );
    this.participantService = new ParticipantService(
      repos.getParticipants(),
      repos.getContributions(),
      repos.getTandas()
    );
    this.contributionService = new ContributionService(
      repos.getContributions(),
      repos.getParticipants(),
      repos.getTandas()
    );
  }

  getUsers(): UserService {
    return this.userService;
  }

  getTandas(): TandaService {
    return this.tandaService;
  }

  getParticipants(): ParticipantService {
    return this.participantService;
  }

  getContributions(): ContributionService {
    return this.contributionService;
  }
}
