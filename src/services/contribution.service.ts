import * as tandaRepo from '../repositories/tanda.repo';
import * as participantRepo from '../repositories/participant.repo';
import * as contributionRepo from '../repositories/contribution.repo';
import { NotFoundError, ValidationError, ConflictError, UnprocessableError } from '../errors';
import { config } from '../config';
import type { Contribution, Participant } from '../types';

/**
 * Records a contribution for the active round.
 * Accepts exact amount (paid) or penalized amount (late).
 * @param tandaId - Tanda UUID
 * @param participantId - Participant UUID
 * @param amount - Contributed amount
 * @returns Created Contribution
 */
export function recordContribution(
  tandaId: string,
  participantId: string,
  amount: number,
): Contribution {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.status !== 'active') throw new UnprocessableError('Tanda is not active');

  const participant = participantRepo.findParticipantById(participantId);
  if (!participant || participant.tandaId !== tandaId) {
    throw new NotFoundError('Participant', participantId);
  }

  if (contributionRepo.findContributionByParticipantAndRound(participantId, tanda.currentRound)) {
    throw new ConflictError('Contribution already recorded for this round');
  }

  const expected = tanda.contributionAmount;
  const penalized = parseFloat((expected * (1 - config.latePenaltyPct)).toFixed(2));

  if (amount === expected) {
    return contributionRepo.createContribution(tandaId, participantId, tanda.currentRound, amount, 'paid');
  }
  if (amount === penalized) {
    return contributionRepo.createContribution(tandaId, participantId, tanda.currentRound, amount, 'late');
  }

  throw new ValidationError(
    `Amount must be ${expected} (on time) or ${penalized} (late, with ${config.latePenaltyPct * 100}% penalty)`,
  );
}

/**
 * Returns a round summary: contributions + pot recipient.
 * @param tandaId - Tanda UUID
 * @param round - Round number
 * @returns Round summary object
 */
export function getRoundSummary(
  tandaId: string,
  round: number,
): { round: number; contributions: Contribution[]; recipient: Participant | null } {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);

  const contributions = contributionRepo.findContributionsByRound(tandaId, round);
  const participants = participantRepo.findParticipantsByTanda(tandaId);
  const recipient = participants.find((p) => p.rotationPosition === round) ?? null;

  return { round, contributions, recipient };
}

/**
 * Returns contribution history for a participant.
 * @param tandaId - Tanda UUID
 * @param participantId - Participant UUID
 * @returns Array of Contribution ordered by round
 */
export function getParticipantHistory(tandaId: string, participantId: string): Contribution[] {
  const participant = participantRepo.findParticipantById(participantId);
  if (!participant || participant.tandaId !== tandaId) {
    throw new NotFoundError('Participant', participantId);
  }
  return contributionRepo.findContributionsByParticipant(participantId);
}
