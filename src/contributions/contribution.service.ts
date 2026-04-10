import { IContributionRepository } from './contribution.repository.interface';
import { IParticipantRepository } from '../participants/participant.repository.interface';
import { ITandaRepository } from '../tandas/tanda.repository.interface';
import { ContributionResponseDTO, RoundSummaryDTO } from './contribution.types';
import { toContributionResponseDTO } from './contribution.mapper';
import { NotFoundError, ConflictError, UnprocessableEntityError } from '../errors/AppError';

/**
 * Business logic for contribution recording and round summaries.
 *
 * Dependencies:
 * - tandaRepository: verify tanda exists, is active, and fetch contributionAmount + currentRound
 * - participantRepository: verify the caller is an actual participant in the tanda
 * - contributionRepository: duplicate check, create, and round query
 */
export class ContributionService {
  constructor(
    private readonly tandaRepository: ITandaRepository,
    private readonly participantRepository: IParticipantRepository,
    private readonly contributionRepository: IContributionRepository,
  ) {}

  /**
   * Records a contribution for the current round of an active tanda.
   *
   * Guards (in order):
   * 1. Tanda must exist.
   * 2. Tanda must be in ACTIVE status.
   * 3. User must be a participant in the tanda.
   * 4. Amount must exactly match tanda.contributionAmount.
   * 5. Participant must not have already contributed this round (no duplicates).
   *
   * @param tandaId   - Tanda UUID from the route param
   * @param userId    - User UUID from the validated request body
   * @param amount    - Amount from the validated request body
   * @returns The created contribution as a response DTO
   * @throws NotFoundError if tanda or participant membership is missing
   * @throws ConflictError if tanda is not active or duplicate contribution
   * @throws UnprocessableEntityError if amount doesn't match
   */
  recordContribution(
    tandaId: string,
    userId: string,
    amount: number,
  ): ContributionResponseDTO {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    if (tanda.status !== 'active') {
      throw new ConflictError(
        `Cannot record contribution: tanda '${tandaId}' status is '${tanda.status}', expected 'active'`,
      );
    }

    const participant = this.participantRepository.findByTandaAndUser(tandaId, userId);
    if (!participant) {
      throw new NotFoundError(
        'Participant',
        `user '${userId}' in tanda '${tandaId}'`,
      );
    }

    if (amount !== tanda.contributionAmount) {
      throw new UnprocessableEntityError(
        `Amount ${amount} does not match tanda contribution amount ${tanda.contributionAmount}`,
      );
    }

    const existing = this.contributionRepository.findByParticipantAndRound(
      participant.id,
      tanda.currentRound,
    );
    if (existing) {
      throw new ConflictError(
        `Participant '${participant.id}' has already contributed in round ${tanda.currentRound}`,
      );
    }

    const contribution = this.contributionRepository.create({
      tandaId,
      participantId: participant.id,
      round: tanda.currentRound,
      amount,
      status: 'paid',
    });

    return toContributionResponseDTO(contribution);
  }

  /**
   * Returns a summary of a specific round: paid contributions and pending participants.
   *
   * @param tandaId - Tanda UUID from the route param
   * @param round   - Round number from the route param (already coerced to integer)
   * @returns RoundSummaryDTO with paid list, pending list, and totalCollected
   * @throws NotFoundError if the tanda does not exist
   */
  getRoundSummary(tandaId: string, round: number): RoundSummaryDTO {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    const allParticipants = this.participantRepository.findByTandaId(tandaId);
    const paidContributions = this.contributionRepository.findByTandaAndRound(tandaId, round);

    const paidParticipantIds = new Set(paidContributions.map((c) => c.participantId));

    const pending = allParticipants
      .filter((p) => !paidParticipantIds.has(p.id))
      .map((p) => ({ participantId: p.id, userId: p.userId }));

    const totalCollected = paidContributions.reduce((sum, c) => sum + c.amount, 0);

    return {
      tandaId,
      round,
      totalCollected,
      paid: paidContributions.map(toContributionResponseDTO),
      pending,
    };
  }
}
