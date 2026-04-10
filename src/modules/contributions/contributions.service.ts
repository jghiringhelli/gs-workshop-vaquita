import {
  createContribution,
  findContributionByParticipantAndRound,
  findContributionsByParticipant,
  findContributionsByRound,
  Contribution,
} from './contributions.repository';
import {
  findTandaById,
  findParticipantById,
} from '../tandas/tandas.repository';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../shared/exceptions';
import { PENALTY_PCT } from '../../shared/config';

/**
 * Records a contribution for the active round.
 * Accepts the exact contributionAmount (→ 'paid') or the amount with penalty (→ 'late').
 *
 * @param tandaId - UUID of the tanda.
 * @param participantId - UUID of the participant.
 * @param amount - Amount paid. Must equal contributionAmount or contributionAmount*(1+PENALTY_PCT).
 * @returns The created Contribution.
 */
export function recordContribution(
  tandaId: string,
  participantId: string,
  amount: number,
): Contribution {
  const tanda = findTandaById(tandaId);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  if (tanda.status !== 'active') throw new ConflictError('Tanda is not active');

  const participant = findParticipantById(participantId);
  if (!participant) throw new NotFoundError(`Participant ${participantId} not found`);
  if (participant.tandaId !== tandaId)
    throw new ValidationError('Participant does not belong to this tanda');

  const existing = findContributionByParticipantAndRound(
    participantId,
    tanda.currentRound,
  );
  if (existing && (existing.status === 'paid' || existing.status === 'late'))
    throw new ConflictError('Already contributed for this round');

  const exactAmount = tanda.contributionAmount;
  const lateAmount =
    Math.round(exactAmount * (1 + PENALTY_PCT) * 100) / 100;

  const isExact = Math.abs(amount - exactAmount) < 0.001;
  const isLate = Math.abs(amount - lateAmount) < 0.001;

  if (!isExact && !isLate) {
    throw new ValidationError(
      `Amount must be ${exactAmount} or ${lateAmount} (with late penalty)`,
    );
  }

  return createContribution({
    tandaId,
    participantId,
    round: tanda.currentRound,
    amount,
    status: isExact ? 'paid' : 'late',
  });
}

/**
 * Returns all contributions for a given round in a tanda.
 *
 * @param tandaId - UUID of the tanda.
 * @param round - Round number.
 * @returns Array of Contribution entities.
 */
export function getRoundSummary(
  tandaId: string,
  round: number,
): Contribution[] {
  const tanda = findTandaById(tandaId);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  return findContributionsByRound(tandaId, round);
}

/**
 * Returns a participant's full contribution history.
 *
 * @param tandaId - UUID of the tanda.
 * @param participantId - UUID of the participant.
 * @returns Array of Contribution entities ordered by round.
 */
export function getParticipantHistory(
  tandaId: string,
  participantId: string,
): Contribution[] {
  const tanda = findTandaById(tandaId);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  const participant = findParticipantById(participantId);
  if (!participant) throw new NotFoundError(`Participant ${participantId} not found`);
  return findContributionsByParticipant(participantId);
}
