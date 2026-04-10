import { z } from 'zod';
import { Tanda } from '../domain/Tanda';
import { ITandaRepository } from '../ports/ITandaRepository';
import { IContributionRepository } from '../ports/IContributionRepository';
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../../../shared/exceptions/AppError';

const AdvanceSchema = z.object({ userId: z.string() });

/** Service for advancing tanda rounds and handling auto-completion. */
export class AdvanceService {
  constructor(
    private readonly tandaRepo: ITandaRepository,
    private readonly contributionRepo: IContributionRepository,
  ) {}

  /**
   * Advances the tanda to the next round.
   * Records missed contributions, flags defaulters, auto-completes on last round.
   * @param tandaId - Target tanda id.
   * @param raw - Unvalidated request body containing userId (must be organizer).
   * @returns The updated tanda.
   */
  advanceRound(tandaId: string, raw: unknown): Tanda {
    const { userId } = AdvanceSchema.parse(raw);

    const tanda = this.tandaRepo.findTandaById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
    if (tanda.status === 'completed' || tanda.status === 'cancelled') {
      throw new ConflictError(`Tanda is already ${tanda.status}`);
    }
    if (tanda.organizerId !== userId) {
      throw new ForbiddenError('Only the organizer can advance the round');
    }

    const participants = this.tandaRepo.findParticipantsByTandaId(tandaId);
    const currentRound = tanda.currentRound;

    // Record missed contributions for participants who did not pay
    for (const participant of participants) {
      const existing = this.contributionRepo.findByParticipantAndRound(participant.id, currentRound);
      if (!existing) {
        this.contributionRepo.create({
          tandaId,
          participantId: participant.id,
          round: currentRound,
          amount: 0,
          status: 'missed',
        });

        // Flag as defaulter if 2 consecutive misses
        if (!participant.isDefaulter && currentRound >= 2) {
          const prev = this.contributionRepo.findByParticipantAndRound(participant.id, currentRound - 1);
          if (prev?.status === 'missed') {
            this.tandaRepo.markDefaulter(participant.id);
          }
        }
      }
    }

    // Auto-complete or advance
    if (currentRound >= tanda.totalRounds) {
      this.tandaRepo.updateTanda(tandaId, { status: 'completed' });
    } else {
      this.tandaRepo.updateTanda(tandaId, { currentRound: currentRound + 1 });
    }

    return this.tandaRepo.findTandaById(tandaId)!;
  }
}
