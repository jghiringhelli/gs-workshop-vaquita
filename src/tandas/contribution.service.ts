import { z } from 'zod';
import type { ContributionResponse, RecordContributionDto } from './types';
import type { IContributionRepository } from '../repositories/contribution.repository';
import type { IParticipantRepository } from '../repositories/participant.repository';
import type { ITandaRepository } from '../repositories/tanda.repository';
import { NotFoundError, BusinessRuleError, ConflictError, ValidationError } from '../errors';
import { config } from '../config';

export const RecordContributionSchema = z.object({
  participantId: z.string().min(1, 'participantId is required'),
  amount: z.number({ invalid_type_error: 'amount must be a number' }).positive('amount must be positive'),
});

/** Handles contribution recording, round summaries, and participant history. */
export class ContributionService {
  constructor(
    private readonly contributions: IContributionRepository,
    private readonly participants: IParticipantRepository,
    private readonly tandas: ITandaRepository,
  ) {}

  /**
   * Records a contribution for the current round of an active tanda.
   * @param tandaId - Tanda UUID.
   * @param dto - Contribution data.
   * @returns Created contribution response.
   */
  record(tandaId: string, dto: RecordContributionDto): ContributionResponse {
    const parsed = RecordContributionSchema.safeParse(dto);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
    }

    const tanda = this.tandas.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.status !== 'active') throw new BusinessRuleError('Tanda must be active to record contributions');

    const participant = this.participants.findById(dto.participantId);
    if (!participant) throw new NotFoundError('Participant', dto.participantId);
    if (participant.tandaId !== tandaId) {
      throw new BusinessRuleError('Participant does not belong to this tanda');
    }

    const existing = this.contributions.findByParticipantAndRound(dto.participantId, tanda.currentRound);
    if (existing) throw new ConflictError('Contribution already recorded for this round');

    const status = dto.amount >= tanda.contributionAmount ? 'paid' : 'late';
    const contribution = this.contributions.create(tandaId, dto, tanda.currentRound, status);

    if (status === 'paid') {
      this.participants.resetConsecutiveMissed(dto.participantId);
    } else {
      this.participants.incrementConsecutiveMissed(dto.participantId);
      const updated = this.participants.findById(dto.participantId);
      if (updated && updated.consecutiveMissed >= config.missedContributionsLimit) {
        this.participants.markAsDefaulter(dto.participantId);
      }
    }

    return contribution;
  }

  /**
   * Returns all contributions for a specific round.
   * @param tandaId - Tanda UUID.
   * @param round - Round number.
   * @returns Array of contribution responses.
   */
  getRoundSummary(tandaId: string, round: number): ReadonlyArray<ContributionResponse> {
    if (!this.tandas.findById(tandaId)) throw new NotFoundError('Tanda', tandaId);
    return this.contributions.findByTandaAndRound(tandaId, round);
  }

  /**
   * Returns the full contribution history for a participant.
   * @param tandaId - Tanda UUID.
   * @param participantId - Participant UUID.
   * @returns Array of contribution responses.
   */
  getParticipantHistory(tandaId: string, participantId: string): ReadonlyArray<ContributionResponse> {
    if (!this.tandas.findById(tandaId)) throw new NotFoundError('Tanda', tandaId);
    const participant = this.participants.findById(participantId);
    if (!participant) throw new NotFoundError('Participant', participantId);
    if (participant.tandaId !== tandaId) {
      throw new BusinessRuleError('Participant does not belong to this tanda');
    }
    return this.contributions.findByParticipantId(participantId);
  }
}
