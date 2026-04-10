import {
  createTanda,
  findTandaById,
  listTandas,
  updateTandaStatus,
  activateTanda,
  incrementTandaRound,
  createParticipant,
  findParticipantByUserAndTanda,
  getParticipantsByTandaId,
  assignRotationPositions,
  updateConsecutiveMisses,
  flagParticipantAsDefaulter,
  Tanda,
  Participant,
} from './tandas.repository';
import { findUserById } from '../users/users.repository';
import {
  createContribution,
  findContributionByParticipantAndRound,
} from '../contributions/contributions.repository';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/exceptions';
import { MAX_PARTICIPANTS } from '../../shared/config';

/**
 * Fisher-Yates shuffle — returns a new shuffled array without mutating the input.
 *
 * @param arr - Source array.
 * @returns New shuffled array.
 */
function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = temp;
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Tanda lifecycle
// ---------------------------------------------------------------------------

/**
 * Creates a new tanda and automatically adds the organizer as the first participant.
 *
 * @param name - Human-readable tanda name.
 * @param contributionAmount - Fixed per-round contribution amount.
 * @param organizerId - UUID of the organizing user.
 * @returns The created Tanda.
 */
export function createTandaService(
  name: string,
  contributionAmount: number,
  organizerId: string,
): Tanda {
  const organizer = findUserById(organizerId);
  if (!organizer) throw new NotFoundError(`User ${organizerId} not found`);

  const tanda = createTanda(name, organizerId, contributionAmount);
  createParticipant(organizerId, tanda.id, 'organizer');
  return tanda;
}

/**
 * Returns a tanda by ID including its participant list.
 *
 * @param id - UUID of the tanda.
 * @returns Tanda entity augmented with a participants array.
 */
export function getTandaWithParticipants(
  id: string,
): Tanda & { participants: Participant[] } {
  const tanda = findTandaById(id);
  if (!tanda) throw new NotFoundError(`Tanda ${id} not found`);
  return { ...tanda, participants: getParticipantsByTandaId(id) };
}

/**
 * Lists tandas, optionally filtered to those a specific user has joined.
 *
 * @param userId - Optional user UUID filter.
 * @returns Array of Tanda entities.
 */
export function listTandasService(userId?: string): Tanda[] {
  return listTandas(userId);
}

/**
 * Adds a user to a forming tanda as a member.
 *
 * @param tandaId - UUID of the tanda.
 * @param userId - UUID of the user to add.
 * @returns The created Participant.
 */
export function joinTanda(tandaId: string, userId: string): Participant {
  const tanda = findTandaById(tandaId);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  if (tanda.status !== 'forming')
    throw new ConflictError('Tanda is no longer accepting members');

  const user = findUserById(userId);
  if (!user) throw new NotFoundError(`User ${userId} not found`);

  const existing = findParticipantByUserAndTanda(userId, tandaId);
  if (existing) throw new ConflictError('User is already a participant');

  const count = getParticipantsByTandaId(tandaId).length;
  if (count >= MAX_PARTICIPANTS)
    throw new ConflictError(`Tanda is full (max ${MAX_PARTICIPANTS} participants)`);

  return createParticipant(userId, tandaId, 'member');
}

/**
 * Starts a forming tanda: validates participant count, randomises rotation,
 * and transitions status to 'active'.
 *
 * @param tandaId - UUID of the tanda.
 * @param organizerId - UUID of the caller; must be the tanda organizer.
 * @returns The updated Tanda.
 */
export function startTanda(tandaId: string, organizerId: string): Tanda {
  const tanda = findTandaById(tandaId);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  if (tanda.organizerId !== organizerId)
    throw new ForbiddenError('Only the organizer can start the tanda');
  if (tanda.status !== 'forming')
    throw new ConflictError('Tanda is not in forming state');

  const participants = getParticipantsByTandaId(tandaId);
  if (participants.length < 3)
    throw new ConflictError('A tanda needs at least 3 participants to start');

  const shuffledIds = shuffle(participants.map((p) => p.id));
  const assignments = shuffledIds.map((id, index) => ({
    id,
    position: index + 1,
  }));
  assignRotationPositions(assignments);
  activateTanda(tandaId, participants.length);

  return findTandaById(tandaId) as Tanda;
}

/**
 * Cancels a tanda. Only the organizer may cancel; status must be forming or active.
 *
 * @param tandaId - UUID of the tanda.
 * @param organizerId - UUID of the caller; must be the tanda organizer.
 * @returns The updated Tanda.
 */
export function cancelTanda(tandaId: string, organizerId: string): Tanda {
  const tanda = findTandaById(tandaId);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  if (tanda.organizerId !== organizerId)
    throw new ForbiddenError('Only the organizer can cancel the tanda');
  if (tanda.status !== 'forming' && tanda.status !== 'active')
    throw new ConflictError('Tanda cannot be cancelled in its current state');

  updateTandaStatus(tandaId, 'cancelled');
  return findTandaById(tandaId) as Tanda;
}

// ---------------------------------------------------------------------------
// Round management
// ---------------------------------------------------------------------------

/**
 * Returns all participants for a given tanda.
 *
 * @param tandaId - UUID of the tanda.
 * @returns Array of Participant entities.
 */
export function listParticipants(tandaId: string): Participant[] {
  const tanda = findTandaById(tandaId);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  return getParticipantsByTandaId(tandaId);
}

/**
 * Advances an active tanda to the next round.
 * Creates 'missed' contributions for unpaid participants, updates consecutive-miss
 * counters, flags defaulters, and either increments currentRound or completes the tanda.
 *
 * @param tandaId - UUID of the tanda.
 * @param organizerId - UUID of the caller; must be the tanda organizer.
 * @returns The updated Tanda.
 */
export function advanceRound(tandaId: string, organizerId: string): Tanda {
  const tanda = findTandaById(tandaId);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  if (tanda.organizerId !== organizerId)
    throw new ForbiddenError('Only the organizer can advance the round');
  if (tanda.status !== 'active')
    throw new ConflictError('Tanda is not active');

  const participants = getParticipantsByTandaId(tandaId);
  const currentRound = tanda.currentRound;

  for (const participant of participants) {
    const paid = findContributionByParticipantAndRound(
      participant.id,
      currentRound,
    );
    const hasPaid =
      paid !== undefined &&
      (paid.status === 'paid' || paid.status === 'late');

    if (!hasPaid) {
      createContribution({
        tandaId,
        participantId: participant.id,
        round: currentRound,
        amount: tanda.contributionAmount,
        status: 'missed',
      });
      const newMisses = participant.consecutiveMisses + 1;
      updateConsecutiveMisses(participant.id, newMisses);
      if (newMisses >= 2) flagParticipantAsDefaulter(participant.id);
    } else {
      updateConsecutiveMisses(participant.id, 0);
    }
  }

  if (currentRound + 1 > tanda.totalRounds) {
    updateTandaStatus(tandaId, 'completed');
  } else {
    incrementTandaRound(tandaId);
  }

  return findTandaById(tandaId) as Tanda;
}
