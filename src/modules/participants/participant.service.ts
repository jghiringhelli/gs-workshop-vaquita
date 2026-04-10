import * as participantRepo from './participant.repository';
import { config } from '../../config';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError';
import type { Tanda } from '../tandas/tanda.repository';

export function joinTanda(tanda: Tanda, userId: string) {
  if (tanda.status !== 'forming') {
    throw new ValidationError('Can only join a tanda in forming status');
  }
  const existing = participantRepo.findParticipantByUserAndTanda(userId, tanda.id);
  if (existing) throw new ConflictError('User is already a participant in this tanda');

  const participants = participantRepo.listParticipantsByTanda(tanda.id);
  if (participants.length >= config.tanda.maxParticipants) {
    throw new ValidationError(`Tanda is full (max ${config.tanda.maxParticipants} participants)`);
  }

  return participantRepo.createParticipant(userId, tanda.id, 'member');
}

export function getParticipant(id: string) {
  const p = participantRepo.findParticipantById(id);
  if (!p) throw new NotFoundError('Participant', id);
  return p;
}

export function listParticipants(tandaId: string) {
  return participantRepo.listParticipantsByTanda(tandaId);
}
