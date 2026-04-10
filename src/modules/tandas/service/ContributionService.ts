import { z } from 'zod';
import { Contribution } from '../domain/Tanda';
import { ITandaRepository } from '../ports/ITandaRepository';
import { IContributionRepository } from '../ports/IContributionRepository';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
} from '../../../shared/exceptions/AppError';

const RecordContributionSchema = z.object({
  participantId: z.string(),
  amount: z.number().positive(),
});

export interface RoundSummary {
  round: number;
  tandaId: string;
  contributions: Contribution[];
}

/** Service containing all contribution business logic. */
export class ContributionService {
  constructor(
    private readonly tandaRepo: ITandaRepository,
    private readonly contributionRepo: IContributionRepository,
  ) {}

  /**
   * Records a contribution for the current round.
   * @param tandaId - Target tanda id.
   * @param raw - Unvalidated request body containing participantId and amount.
   * @returns The recorded contribution.
   */
  recordContribution(tandaId: string, raw: unknown): Contribution {
    const { participantId, amount } = RecordContributionSchema.parse(raw);

    const tanda = this.tandaRepo.findTandaById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
    if (tanda.status !== 'active') {
      throw new UnprocessableError('Contributions can only be recorded for an ACTIVE tanda');
    }

    const participants = this.tandaRepo.findParticipantsByTandaId(tandaId);
    const participant = participants.find(p => p.id === participantId);
    if (!participant) throw new NotFoundError(`Participant ${participantId} not found in this tanda`);

    if (amount !== tanda.contributionAmount) {
      throw new ValidationError(
        `Amount must be ${tanda.contributionAmount} (received ${amount})`,
      );
    }

    const existing = this.contributionRepo.findByParticipantAndRound(
      participantId,
      tanda.currentRound,
    );
    if (existing) throw new ConflictError('Participant has already contributed this round');

    return this.contributionRepo.create({
      tandaId,
      participantId,
      round: tanda.currentRound,
      amount,
      status: 'paid',
    });
  }

  /**
   * Returns a summary of all contributions for a given round.
   * @param tandaId - Target tanda id.
   * @param round - Round number.
   * @returns Round summary with contributions.
   */
  getRoundSummary(tandaId: string, round: number): RoundSummary {
    const tanda = this.tandaRepo.findTandaById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
    const contributions = this.contributionRepo.findByTandaAndRound(tandaId, round);
    return { round, tandaId, contributions };
  }

  /**
   * Returns the full contribution history for a participant.
   * @param tandaId - Tanda id (used to verify participant belongs to it).
   * @param participantId - Participant UUID.
   * @returns Array of contributions.
   */
  getParticipantHistory(tandaId: string, participantId: string): Contribution[] {
    const tanda = this.tandaRepo.findTandaById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
    const participants = this.tandaRepo.findParticipantsByTandaId(tandaId);
    if (!participants.find(p => p.id === participantId)) {
      throw new NotFoundError(`Participant ${participantId} not found in this tanda`);
    }
    return this.contributionRepo.findByParticipant(participantId);
  }
}
