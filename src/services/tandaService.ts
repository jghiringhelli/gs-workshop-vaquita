import { config } from '../config';
import * as tandaRepo from '../repositories/tandaRepository';
import * as participantRepo from '../repositories/participantRepository';
import * as userRepo from '../repositories/userRepository';
import * as contributionRepo from '../repositories/contributionRepository';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../errors/AppError';
import { Tanda, Participant } from '../types';

const MIN_PARTICIPANTS = 3;

export function createTanda(data: { name: string; organizerId: number; contributionAmount: number }): Tanda {
  const organizer = userRepo.findById(data.organizerId);
  if (!organizer) {
    throw new NotFoundError(`User with id ${data.organizerId} not found`);
  }
  const tanda = tandaRepo.create(data);
  participantRepo.create({ userId: data.organizerId, tandaId: tanda.id, role: 'organizer' });
  return tanda;
}

export function getTanda(id: number): Tanda {
  const tanda = tandaRepo.findById(id);
  if (!tanda) {
    throw new NotFoundError(`Tanda with id ${id} not found`);
  }
  return tanda;
}

export function listTandas(userId?: number): Tanda[] {
  if (userId !== undefined) {
    return tandaRepo.findByUserId(userId);
  }
  return tandaRepo.findAll();
}

export function joinTanda(tandaId: number, userId: number): Participant {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) {
    throw new NotFoundError(`Tanda with id ${tandaId} not found`);
  }
  if (tanda.status !== 'forming') {
    throw new ValidationError('Tanda is not in forming status');
  }
  const user = userRepo.findById(userId);
  if (!user) {
    throw new NotFoundError(`User with id ${userId} not found`);
  }
  const existing = participantRepo.findByUserAndTanda(userId, tandaId);
  if (existing) {
    throw new ConflictError('User is already a participant in this tanda');
  }
  const count = participantRepo.countByTanda(tandaId);
  if (count >= config.maxParticipants) {
    throw new ValidationError(`Tanda is full (max ${config.maxParticipants} participants)`);
  }
  return participantRepo.create({ userId, tandaId, role: 'member' });
}

export function startTanda(tandaId: number, organizerId: number): Tanda {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) {
    throw new NotFoundError(`Tanda with id ${tandaId} not found`);
  }
  const organizerParticipant = participantRepo.findByUserAndTanda(organizerId, tandaId);
  if (!organizerParticipant || organizerParticipant.role !== 'organizer') {
    throw new ForbiddenError('Only the organizer can start the tanda');
  }
  if (tanda.status !== 'forming') {
    throw new ValidationError('Tanda must be in forming status to start');
  }
  const participants = participantRepo.findByTandaId(tandaId);
  if (participants.length < MIN_PARTICIPANTS) {
    throw new ValidationError(`Tanda requires at least ${MIN_PARTICIPANTS} participants`);
  }
  // Fisher-Yates shuffle
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const positions = shuffled.map((p, idx) => ({ id: p.id, rotationPosition: idx + 1 }));
  participantRepo.updateRotationPositions(tandaId, positions);
  return tandaRepo.update(tandaId, {
    status: 'active',
    currentRound: 1,
    totalRounds: participants.length,
  });
}

export function cancelTanda(tandaId: number, organizerId: number): Tanda {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) {
    throw new NotFoundError(`Tanda with id ${tandaId} not found`);
  }
  const organizerParticipant = participantRepo.findByUserAndTanda(organizerId, tandaId);
  if (!organizerParticipant || organizerParticipant.role !== 'organizer') {
    throw new ForbiddenError('Only the organizer can cancel the tanda');
  }
  if (tanda.status !== 'forming' && tanda.status !== 'active') {
    throw new ValidationError('Tanda must be forming or active to cancel');
  }
  return tandaRepo.update(tandaId, { status: 'cancelled' });
}

export function advanceRound(tandaId: number, organizerId: number): Tanda {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) {
    throw new NotFoundError(`Tanda with id ${tandaId} not found`);
  }
  const organizerParticipant = participantRepo.findByUserAndTanda(organizerId, tandaId);
  if (!organizerParticipant || organizerParticipant.role !== 'organizer') {
    throw new ForbiddenError('Only the organizer can advance the round');
  }
  if (tanda.status !== 'active') {
    throw new ValidationError('Tanda must be active to advance the round');
  }

  const participants = participantRepo.findByTandaId(tandaId);

  // Mark unpaid participants as 'missed' and check for defaulters
  for (const participant of participants) {
    const contribution = contributionRepo.findByParticipantAndRound(participant.id, tanda.currentRound);
    if (!contribution) {
      contributionRepo.create({
        tandaId,
        participantId: participant.id,
        round: tanda.currentRound,
        amount: 0,
        status: 'missed',
      });
    }

    // Check last 2 rounds for consecutive misses
    if (tanda.currentRound >= 2) {
      const lastTwo = contributionRepo.findLastNByParticipant(participant.id, 2);
      const consecutiveMisses = lastTwo.length === 2 && lastTwo.every(c => c.status === 'missed');
      if (consecutiveMisses) {
        participantRepo.updateIsDefaulter(participant.id, true);
      }
    }
  }

  if (tanda.currentRound === tanda.totalRounds) {
    return tandaRepo.update(tandaId, { status: 'completed' });
  }
  return tandaRepo.update(tandaId, { currentRound: tanda.currentRound + 1 });
}

export function getTandaParticipants(tandaId: number): Participant[] {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) {
    throw new NotFoundError(`Tanda with id ${tandaId} not found`);
  }
  return participantRepo.findByTandaId(tandaId);
}
