import { z } from 'zod';
import * as tandaRepo from './tanda.repository';
import * as participantRepo from '../participants/participant.repository';
import * as userRepo from '../users/user.repository';
import { config } from '../../config';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError';

export const CreateTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.string().uuid(),
  contributionAmount: z.number().positive(),
});

export const JoinTandaSchema = z.object({
  userId: z.string().uuid(),
});

export const OrganizerSchema = z.object({
  organizerId: z.string().uuid(),
});

export type CreateTandaInput = z.infer<typeof CreateTandaSchema>;

export function createTanda(input: CreateTandaInput) {
  const organizer = userRepo.findUserById(input.organizerId);
  if (!organizer) throw new NotFoundError('User', input.organizerId);

  const tanda = tandaRepo.createTanda(input.name, input.organizerId, input.contributionAmount);
  participantRepo.createParticipant(input.organizerId, tanda.id, 'organizer');
  return tanda;
}

export function getTanda(id: string) {
  const tanda = tandaRepo.findTandaById(id);
  if (!tanda) throw new NotFoundError('Tanda', id);
  return tanda;
}

export function listTandas(userId?: string) {
  if (userId) return tandaRepo.listTandasByUser(userId);
  return tandaRepo.listAllTandas();
}

export function joinTanda(tandaId: string, userId: string) {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.status !== 'forming') throw new ValidationError('Can only join a tanda in forming status');

  const user = userRepo.findUserById(userId);
  if (!user) throw new NotFoundError('User', userId);

  const existing = participantRepo.findParticipantByUserAndTanda(userId, tandaId);
  if (existing) throw new ConflictError('User is already a participant in this tanda');

  const participants = participantRepo.listParticipantsByTanda(tandaId);
  if (participants.length >= config.tanda.maxParticipants) {
    throw new ValidationError(`Tanda is full (max ${config.tanda.maxParticipants} participants)`);
  }

  return participantRepo.createParticipant(userId, tandaId, 'member');
}

export function startTanda(tandaId: string, organizerId: string) {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.organizerId !== organizerId) throw new ForbiddenError('Only the organizer can start the tanda');
  if (tanda.status !== 'forming') throw new ValidationError('Tanda is not in forming status');

  const participants = participantRepo.listParticipantsByTanda(tandaId);
  if (participants.length < config.tanda.minParticipants) {
    throw new ValidationError(`Need at least ${config.tanda.minParticipants} participants to start`);
  }

  const positions = participants.map((_, i) => i + 1);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  const assignments = participants.map((p, i) => ({ id: p.id, rotationPosition: positions[i] }));
  participantRepo.updateParticipantPositions(assignments);

  const totalRounds = participants.length;
  tandaRepo.updateTandaStart(tandaId, totalRounds);
  return tandaRepo.findTandaById(tandaId)!;
}

export function cancelTanda(tandaId: string, organizerId: string) {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.organizerId !== organizerId) throw new ForbiddenError('Only the organizer can cancel the tanda');
  if (tanda.status === 'completed' || tanda.status === 'cancelled') {
    throw new ValidationError(`Cannot cancel a tanda with status '${tanda.status}'`);
  }

  tandaRepo.updateTandaStatus(tandaId, 'cancelled');
  return tandaRepo.findTandaById(tandaId)!;
}
