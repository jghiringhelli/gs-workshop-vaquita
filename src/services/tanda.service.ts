import * as tandaRepo from '../repositories/tanda.repo';
import * as participantRepo from '../repositories/participant.repo';
import * as contributionRepo from '../repositories/contribution.repo';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../errors';
import { config } from '../config';
import type { Tanda, Participant } from '../types';

/**
 * Creates a tanda and auto-joins the organizer as first participant.
 * @param name - Tanda name
 * @param organizerId - User UUID
 * @param contributionAmount - Fixed amount per round
 * @returns Created Tanda
 */
export function createTanda(name: string, organizerId: string, contributionAmount: number): Tanda {
  const tanda = tandaRepo.createTanda(name, organizerId, contributionAmount);
  participantRepo.createParticipant(organizerId, tanda.id, 'organizer');
  return tanda;
}

/**
 * Returns a tanda by ID.
 * @param id - Tanda UUID
 * @returns Tanda
 */
export function getTanda(id: string): Tanda {
  const tanda = tandaRepo.findTandaById(id);
  if (!tanda) throw new NotFoundError('Tanda', id);
  return tanda;
}

/**
 * Returns all tandas a user participates in.
 * @param userId - User UUID
 * @returns Array of Tanda
 */
export function listTandas(userId: string): Tanda[] {
  return tandaRepo.findTandasByUserId(userId);
}

/**
 * Joins a FORMING tanda as a member.
 * @param tandaId - Tanda UUID
 * @param userId - User UUID joining
 * @returns New Participant
 */
export function joinTanda(tandaId: string, userId: string): Participant {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.status !== 'forming') throw new ConflictError('Can only join a tanda in FORMING status');

  if (participantRepo.findParticipantByUserAndTanda(userId, tandaId)) {
    throw new ConflictError('User is already a participant');
  }

  const count = participantRepo.countParticipants(tandaId);
  if (count >= config.maxParticipants) {
    throw new ValidationError(`Tanda is full (max ${config.maxParticipants} participants)`);
  }

  return participantRepo.createParticipant(userId, tandaId, 'member');
}

/**
 * Starts a tanda: randomizes rotation and transitions FORMING → ACTIVE.
 * @param tandaId - Tanda UUID
 * @param requesterId - Must be the organizer
 * @returns Updated Tanda
 */
export function startTanda(tandaId: string, requesterId: string): Tanda {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.organizerId !== requesterId) throw new ForbiddenError('Only the organizer can start the tanda');
  if (tanda.status !== 'forming') throw new ConflictError('Tanda is not in FORMING status');

  const participants = participantRepo.findParticipantsByTanda(tandaId);
  if (participants.length < 3) {
    throw new ValidationError('Minimum 3 participants required to start');
  }

  // Randomize rotation order and lock it
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  participantRepo.assignRotationPositions(tandaId, shuffled.map((p) => p.id));

  const totalRounds = participants.length;
  tandaRepo.updateTandaRound(tandaId, 1, totalRounds);
  tandaRepo.updateTandaStatus(tandaId, 'active');

  return tandaRepo.findTandaById(tandaId)!;
}

/**
 * Cancels a tanda (organizer only).
 * @param tandaId - Tanda UUID
 * @param requesterId - Must be the organizer
 * @returns Updated Tanda
 */
export function cancelTanda(tandaId: string, requesterId: string): Tanda {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.organizerId !== requesterId) throw new ForbiddenError('Only the organizer can cancel the tanda');
  if (tanda.status === 'completed' || tanda.status === 'cancelled') {
    throw new ConflictError(`Tanda is already ${tanda.status}`);
  }

  tandaRepo.updateTandaStatus(tandaId, 'cancelled');
  return tandaRepo.findTandaById(tandaId)!;
}

/**
 * Returns all participants for a tanda.
 * @param tandaId - Tanda UUID
 * @returns Array of Participant
 */
export function listParticipants(tandaId: string): Participant[] {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  return participantRepo.findParticipantsByTanda(tandaId);
}

/**
 * Advances the tanda to the next round (organizer only).
 * Marks missing contributions as 'missed', flags 2x consecutive defaulters,
 * and auto-completes when the final round is done.
 * @param tandaId - Tanda UUID
 * @param requesterId - Must be the organizer
 * @returns Updated Tanda
 */
export function advanceTanda(tandaId: string, requesterId: string): Tanda {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.organizerId !== requesterId) throw new ForbiddenError('Only the organizer can advance the tanda');
  if (tanda.status !== 'active') throw new ConflictError('Tanda is not active');

  const participants = participantRepo.findParticipantsByTanda(tandaId);

  // Mark missing contributions as 'missed' and check for consecutive defaults
  for (const participant of participants) {
    const existing = contributionRepo.findContributionByParticipantAndRound(
      participant.id,
      tanda.currentRound,
    );
    if (!existing) {
      contributionRepo.createContribution(
        tandaId,
        participant.id,
        tanda.currentRound,
        0,
        'missed',
      );
    }

    // Flag as defaulter on 2 consecutive misses
    if (tanda.currentRound >= 2) {
      const prev = contributionRepo.findContributionByParticipantAndRound(
        participant.id,
        tanda.currentRound - 1,
      );
      const curr = existing ?? { status: 'missed' };
      if (prev?.status === 'missed' && curr.status === 'missed') {
        participantRepo.setDefaulter(participant.id);
      }
    }
  }

  // Auto-complete after final round
  if (tanda.currentRound >= tanda.totalRounds) {
    tandaRepo.updateTandaStatus(tandaId, 'completed');
  } else {
    tandaRepo.advanceTandaRound(tandaId);
  }

  return tandaRepo.findTandaById(tandaId)!;
}
