import { env } from '../../config/env';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../errors';
import * as userRepo from '../users/user.repo';
import * as tandaRepo from './tanda.repo';
import type { Tanda } from './tanda.repo';
import * as participantRepo from './participant.repo';
import type { Participant } from './participant.repo';
import * as contributionRepo from './contribution.repo';
import type { Contribution } from './contribution.repo';
import { assignRotationPositions } from './rotation';
import type { CreateTandaInput } from './tanda.schemas';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns true if the contribution window for the current round has elapsed.
 *
 * @param roundStartedAt - ISO-8601 string when the round began.
 * @returns True when now > roundStartedAt + ROUND_WINDOW_HOURS.
 */
function isContributionLate(roundStartedAt: string | null): boolean {
  if (roundStartedAt === null) return false;
  const windowEndMs =
    new Date(roundStartedAt).getTime() + env.ROUND_WINDOW_HOURS * 60 * 60 * 1000;
  return Date.now() > windowEndMs;
}

/**
 * Computes whether a participant has missed 2 or more consecutive contributions.
 * This is derived/computed — not persisted.
 *
 * @param participantId - The participant to evaluate.
 * @param contributions - All contributions for that participant.
 * @returns True if the participant has 2+ consecutive missed contributions.
 */
function isDefaulter(participantId: string, contributions: Contribution[]): boolean {
  const sorted = contributions
    .filter((c) => c.participantId === participantId)
    .sort((a, b) => a.round - b.round);

  let consecutive = 0;
  for (const c of sorted) {
    if (c.status === 'missed') {
      consecutive += 1;
      if (consecutive >= 2) return true;
    } else {
      consecutive = 0;
    }
  }
  return false;
}

// ─── Public service functions ────────────────────────────────────────────────

/**
 * Creates a new tanda in 'forming' status and auto-joins the creator as organizer.
 *
 * @param input - Validated tanda creation data.
 * @param organizerId - User ID of the authenticated creator.
 * @returns The created tanda and the organizer's participant record.
 */
export function createTanda(
  input: CreateTandaInput,
  organizerId: string,
): { tanda: Tanda; participant: Participant } {
  const user = userRepo.findUserById(organizerId);
  if (user === undefined) throw new NotFoundError('Authenticated user not found');

  const tanda = tandaRepo.createTanda({
    name: input.name,
    organizerId,
    contributionAmount: input.contributionAmount,
  });

  const participant = participantRepo.createParticipant({
    userId: organizerId,
    tandaId: tanda.id,
    role: 'organizer',
  });

  return { tanda, participant };
}

/**
 * Returns all tandas in which the given user is a participant.
 *
 * @param userId - The user whose tandas to list.
 * @returns Array of tanda records.
 */
export function listTandas(userId: string): Tanda[] {
  return tandaRepo.findTandasByUserId(userId);
}

/**
 * Returns a tanda with its full participant list.
 * Throws NotFoundError if the tanda does not exist.
 *
 * @param tandaId - The tanda's UUID.
 * @returns The tanda and its participants.
 */
export function getTanda(tandaId: string): { tanda: Tanda; participants: Participant[] } {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (tanda === undefined) throw new NotFoundError(`Tanda '${tandaId}' not found`);
  const participants = participantRepo.findParticipantsByTandaId(tandaId);
  return { tanda, participants };
}

/**
 * Adds a user as a member participant to a forming tanda.
 *
 * Rules enforced:
 * - Tanda must be in 'forming' status.
 * - User must not already be a participant.
 * - Participant count must not exceed MAX_PARTICIPANTS.
 *
 * @param tandaId - The tanda's UUID.
 * @param userId - The user joining.
 * @returns The newly created participant record.
 */
export function joinTanda(tandaId: string, userId: string): Participant {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (tanda === undefined) throw new NotFoundError(`Tanda '${tandaId}' not found`);
  if (tanda.status !== 'forming') {
    throw new BusinessRuleError('You can only join a tanda that is still forming');
  }

  const existing = participantRepo.findParticipantByUserAndTanda(userId, tandaId);
  if (existing !== undefined) throw new ConflictError('You are already a participant in this tanda');

  const count = participantRepo.countParticipantsByTandaId(tandaId);
  if (count >= env.MAX_PARTICIPANTS) {
    throw new BusinessRuleError(
      `This tanda has reached its maximum of ${env.MAX_PARTICIPANTS} participants`,
    );
  }

  return participantRepo.createParticipant({ userId, tandaId, role: 'member' });
}

/**
 * Starts a tanda (FORMING → ACTIVE).
 *
 * Rules enforced:
 * - Requester must be the organizer.
 * - Tanda must be in 'forming' status.
 * - At least MIN_PARTICIPANTS_TO_START participants must have joined.
 * - Assigns random rotation positions 1..N and locks them.
 * - Sets totalRounds = participant count, currentRound = 1, roundStartedAt = now.
 *
 * @param tandaId - The tanda's UUID.
 * @param requestUserId - Authenticated user performing the action.
 * @returns The updated tanda record.
 */
export function startTanda(tandaId: string, requestUserId: string): Tanda {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (tanda === undefined) throw new NotFoundError(`Tanda '${tandaId}' not found`);
  if (tanda.organizerId !== requestUserId) {
    throw new ForbiddenError('Only the organizer can start the tanda');
  }
  if (tanda.status !== 'forming') {
    throw new BusinessRuleError(`Tanda cannot be started from '${tanda.status}' status`);
  }

  const participants = participantRepo.findParticipantsByTandaId(tandaId);
  if (participants.length < env.MIN_PARTICIPANTS_TO_START) {
    throw new BusinessRuleError(
      `At least ${env.MIN_PARTICIPANTS_TO_START} participants are required to start (currently ${participants.length})`,
    );
  }

  const assigned = assignRotationPositions(participants);
  participantRepo.updateRotationPositions(assigned);

  return tandaRepo.updateTanda(tandaId, {
    status: 'active',
    totalRounds: participants.length,
    currentRound: 1,
    roundStartedAt: new Date().toISOString(),
  });
}

/**
 * Cancels a tanda. Allowed from 'forming' or 'active' status.
 *
 * @param tandaId - The tanda's UUID.
 * @param requestUserId - Authenticated user performing the action.
 * @returns The updated tanda record.
 */
export function cancelTanda(tandaId: string, requestUserId: string): Tanda {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (tanda === undefined) throw new NotFoundError(`Tanda '${tandaId}' not found`);
  if (tanda.organizerId !== requestUserId) {
    throw new ForbiddenError('Only the organizer can cancel the tanda');
  }
  if (tanda.status === 'completed' || tanda.status === 'cancelled') {
    throw new BusinessRuleError(`Cannot cancel a tanda with status '${tanda.status}'`);
  }
  return tandaRepo.updateTanda(tandaId, { status: 'cancelled' });
}

/**
 * Returns the list of participants for a tanda.
 *
 * @param tandaId - The tanda's UUID.
 * @returns Array of participant records.
 */
export function getParticipants(tandaId: string): Participant[] {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (tanda === undefined) throw new NotFoundError(`Tanda '${tandaId}' not found`);
  return participantRepo.findParticipantsByTandaId(tandaId);
}

/**
 * Records the authenticated user's contribution for the current round.
 *
 * Rules enforced:
 * - Tanda must be active.
 * - User must be a participant in the tanda.
 * - Cannot contribute twice in the same round (409 Conflict).
 * - Amount = contributionAmount * (1 + PENALTY_PERCENT) if past window, else contributionAmount.
 * - Status = 'late' if past window, else 'paid'.
 *
 * @param tandaId - The tanda's UUID.
 * @param requestUserId - Authenticated user making the contribution.
 * @returns The created contribution record.
 */
export function recordContribution(
  tandaId: string,
  requestUserId: string,
): Contribution {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (tanda === undefined) throw new NotFoundError(`Tanda '${tandaId}' not found`);
  if (tanda.status !== 'active') {
    throw new BusinessRuleError('Contributions can only be recorded for active tandas');
  }

  const participant = participantRepo.findParticipantByUserAndTanda(requestUserId, tandaId);
  if (participant === undefined) {
    throw new ForbiddenError('You are not a participant in this tanda');
  }

  const existing = contributionRepo.findByParticipantAndRound(
    participant.id,
    tanda.currentRound,
  );
  if (existing !== undefined) {
    throw new ConflictError('You have already contributed for the current round');
  }

  const late = isContributionLate(tanda.roundStartedAt);
  const amount = late
    ? tanda.contributionAmount * (1 + env.PENALTY_PERCENT)
    : tanda.contributionAmount;
  const status = late ? 'late' : 'paid';

  return contributionRepo.createContribution({
    tandaId,
    participantId: participant.id,
    round: tanda.currentRound,
    amount,
    status,
  });
}

/** Per-participant contribution status entry in a round summary. */
export interface ParticipantRoundStatus {
  participant: Participant;
  contribution: Contribution | null;
  isDefaulter: boolean;
}

/** Full round summary response shape. */
export interface RoundSummary {
  tandaId: string;
  round: number;
  receiver: Participant | null;
  participantStatuses: ParticipantRoundStatus[];
  totalCollected: number;
  missingCount: number;
  isPastWindow: boolean;
}

/**
 * Returns a summary of a specific round for a tanda.
 *
 * Includes: pot receiver, per-participant contribution statuses,
 * total collected, missing count, and whether the round window is past.
 *
 * @param tandaId - The tanda's UUID.
 * @param round - The round number.
 * @returns Full round summary.
 */
export function getRoundSummary(tandaId: string, round: number): RoundSummary {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (tanda === undefined) throw new NotFoundError(`Tanda '${tandaId}' not found`);

  const participants = participantRepo.findParticipantsByTandaId(tandaId);
  const contributions = contributionRepo.findByTandaAndRound(tandaId, round);
  const allContributions = contributionRepo.findByTanda(tandaId);

  const receiver = participants.find((p) => p.rotationPosition === round) ?? null;
  const contribMap = new Map(contributions.map((c) => [c.participantId, c]));

  const participantStatuses: ParticipantRoundStatus[] = participants.map((p) => ({
    participant: p,
    contribution: contribMap.get(p.id) ?? null,
    isDefaulter: isDefaulter(p.id, allContributions),
  }));

  const totalCollected = contributions
    .filter((c) => c.status === 'paid' || c.status === 'late')
    .reduce((sum, c) => sum + c.amount, 0);

  const missingCount = participants.filter(
    (p) => !contribMap.has(p.id),
  ).length;

  return {
    tandaId,
    round,
    receiver,
    participantStatuses,
    totalCollected,
    missingCount,
    isPastWindow: isContributionLate(tanda.roundStartedAt),
  };
}

/**
 * Advances the tanda to the next round (organizer only).
 *
 * Before advancing:
 * - Any participant without a paid/late contribution is marked 'missed'.
 *
 * After advancing:
 * - If currentRound == totalRounds → status = 'completed' (no increment).
 * - Otherwise → currentRound++ and roundStartedAt = now.
 *
 * @param tandaId - The tanda's UUID.
 * @param requestUserId - Authenticated user performing the action.
 * @returns The updated tanda record.
 */
export function advanceRound(tandaId: string, requestUserId: string): Tanda {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (tanda === undefined) throw new NotFoundError(`Tanda '${tandaId}' not found`);
  if (tanda.organizerId !== requestUserId) {
    throw new ForbiddenError('Only the organizer can advance the round');
  }
  if (tanda.status !== 'active') {
    throw new BusinessRuleError('Can only advance an active tanda');
  }

  // Mark missing contributions for the current round
  const participants = participantRepo.findParticipantsByTandaId(tandaId);
  const contributions = contributionRepo.findByTandaAndRound(tandaId, tanda.currentRound);
  const contributedIds = new Set(contributions.map((c) => c.participantId));

  for (const p of participants) {
    if (!contributedIds.has(p.id)) {
      contributionRepo.createContribution({
        tandaId,
        participantId: p.id,
        round: tanda.currentRound,
        amount: tanda.contributionAmount,
        status: 'missed',
      });
    }
  }

  // Complete or advance
  if (tanda.currentRound >= tanda.totalRounds) {
    return tandaRepo.updateTanda(tandaId, { status: 'completed' });
  }

  return tandaRepo.updateTanda(tandaId, {
    currentRound: tanda.currentRound + 1,
    roundStartedAt: new Date().toISOString(),
  });
}

/**
 * Returns contribution history for a specific participant.
 *
 * Access rules:
 * - The organizer can view any participant's history.
 * - A member can only view their own history.
 *
 * @param tandaId - The tanda's UUID.
 * @param participantId - The participant whose history to retrieve.
 * @param requestUserId - Authenticated user making the request.
 * @returns Array of contribution records for that participant.
 */
export function getContributionHistory(
  tandaId: string,
  participantId: string,
  requestUserId: string,
): Contribution[] {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (tanda === undefined) throw new NotFoundError(`Tanda '${tandaId}' not found`);

  const participant = participantRepo.findParticipantById(participantId);
  if (participant === undefined || participant.tandaId !== tandaId) {
    throw new NotFoundError('Participant not found in this tanda');
  }

  const requestParticipant = participantRepo.findParticipantByUserAndTanda(
    requestUserId,
    tandaId,
  );
  if (requestParticipant === undefined) {
    throw new ForbiddenError('You are not a participant in this tanda');
  }

  if (
    requestParticipant.role !== 'organizer' &&
    participant.userId !== requestUserId
  ) {
    throw new ForbiddenError('You can only view your own contribution history');
  }

  return contributionRepo.findByParticipant(participantId);
}
