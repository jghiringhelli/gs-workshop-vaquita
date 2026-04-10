import { ParticipantRepository, Participant } from '../repositories/participant';
import { ContributionRepository } from '../repositories/contribution';
import { TandaRepository } from '../repositories/tanda';

export class ParticipantService {
  constructor(
    private participantRepo: ParticipantRepository,
    private contributionRepo: ContributionRepository,
    private tandaRepo: TandaRepository
  ) {}

  getByTanda(tandaId: string): Participant[] {
    return this.participantRepo.getByTanda(tandaId);
  }

  getHistory(participantId: string): any[] {
    const contributions = this.contributionRepo.getHistory(participantId);
    return contributions;
  }

  checkAndMarkDefaulter(participantId: string): boolean {
    const missed = this.contributionRepo.getMissedByParticipant(participantId, 2);

    if (missed.length >= 2) {
      // Check if they are consecutive (by round number)
      const recentRounds = missed.map((c) => c.round).sort((a, b) => b - a);
      const isConsecutive =
        recentRounds.length >= 2 && recentRounds[0] - recentRounds[1] === 1;

      if (isConsecutive) {
        this.participantRepo.markAsDefaulter(participantId);
        return true;
      }
    }

    return false;
  }
}
