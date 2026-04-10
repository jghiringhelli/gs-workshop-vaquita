import Database from 'better-sqlite3';
import { z } from 'zod';
import { config } from '../config';
import * as tandaRepo from '../repositories/tandaRepository';
import * as participantRepo from '../repositories/participantRepository';
import * as userRepo from '../repositories/userRepository';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../errors/AppError';

const CreateTandaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  organizerId: z.coerce.number().int().positive('organizerId must be a positive integer'),
  contributionAmount: z.number().positive('contributionAmount must be positive'),
});

const JoinTandaSchema = z.object({
  userId: z.coerce.number().int().positive('userId must be a positive integer'),
});

export function createTanda(data: unknown, db?: Database.Database) {
  const parsed = CreateTandaSchema.safeParse(data);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const organizer = userRepo.findUserById(parsed.data.organizerId, db);
  if (!organizer) throw new NotFoundError(`User ${parsed.data.organizerId} not found`);

  const tanda = tandaRepo.createTanda(parsed.data, db);
  participantRepo.createParticipant(
    { userId: parsed.data.organizerId, tandaId: tanda.id, role: 'organizer' },
    db,
  );
  return tanda;
}

export function listTandas(userId?: number, db?: Database.Database) {
  if (userId) {
    return tandaRepo.findTandasByUserId(userId, db);
  }
  return tandaRepo.findAllTandas(db);
}

export function getTandaById(id: string, db?: Database.Database) {
  const tanda = tandaRepo.findTandaById(id, db);
  if (!tanda) throw new NotFoundError(`Tanda ${id} not found`);
  return tanda;
}

export function joinTanda(tandaId: string, data: unknown, db?: Database.Database) {
  const parsed = JoinTandaSchema.safeParse(data);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const tanda = tandaRepo.findTandaById(tandaId, db);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  if (tanda.status !== 'forming') {
    throw new ConflictError('Tanda is not in forming status');
  }

  const user = userRepo.findUserById(parsed.data.userId, db);
  if (!user) throw new NotFoundError(`User ${parsed.data.userId} not found`);

  const existing = participantRepo.findParticipantByUserAndTanda(parsed.data.userId, tandaId, db);
  if (existing) throw new ConflictError('User is already a participant in this tanda');

  const participants = participantRepo.findParticipantsByTandaId(tandaId, db);
  if (participants.length >= config.maxParticipants) {
    throw new ConflictError(
      `Tanda has reached maximum participants (${config.maxParticipants})`,
    );
  }

  return participantRepo.createParticipant(
    { userId: parsed.data.userId, tandaId, role: 'member' },
    db,
  );
}

export function startTanda(tandaId: string, requestingUserId: number, db?: Database.Database) {
  const tanda = tandaRepo.findTandaById(tandaId, db);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  if (tanda.organizerId !== requestingUserId) {
    throw new ForbiddenError('Only the organizer can start the tanda');
  }
  if (tanda.status !== 'forming') {
    throw new ConflictError('Tanda is not in forming status');
  }

  const participants = participantRepo.findParticipantsByTandaId(tandaId, db);
  if (participants.length < config.minParticipants) {
    throw new ValidationError(
      `Tanda needs at least ${config.minParticipants} participants to start`,
    );
  }

  // Randomize rotation positions
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  shuffled.forEach((p, idx) => {
    participantRepo.updateParticipantRotationPosition(p.id, idx + 1, db);
  });

  const totalRounds = participants.length;
  tandaRepo.updateTanda(
    tandaId,
    { status: 'active', currentRound: 1, totalRounds },
    db,
  );

  return tandaRepo.findTandaById(tandaId, db)!;
}

export function cancelTanda(tandaId: string, requestingUserId: number, db?: Database.Database) {
  const tanda = tandaRepo.findTandaById(tandaId, db);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  if (tanda.organizerId !== requestingUserId) {
    throw new ForbiddenError('Only the organizer can cancel the tanda');
  }
  if (tanda.status === 'completed' || tanda.status === 'cancelled') {
    throw new ConflictError(`Tanda is already ${tanda.status}`);
  }

  tandaRepo.updateTanda(tandaId, { status: 'cancelled' }, db);
  return tandaRepo.findTandaById(tandaId, db)!;
}

export function listParticipants(tandaId: string, db?: Database.Database) {
  const tanda = tandaRepo.findTandaById(tandaId, db);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  return participantRepo.findParticipantsByTandaId(tandaId, db);
}

export function advanceRound(tandaId: string, requestingUserId: number, db?: Database.Database) {
  const tanda = tandaRepo.findTandaById(tandaId, db);
  if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
  if (tanda.organizerId !== requestingUserId) {
    throw new ForbiddenError('Only the organizer can advance the round');
  }
  if (tanda.status !== 'active') {
    throw new ConflictError('Tanda is not active');
  }

  const currentRound = tanda.currentRound!;
  const totalRounds = tanda.totalRounds!;

  if (currentRound + 1 >= totalRounds) {
    tandaRepo.updateTanda(tandaId, { status: 'completed' }, db);
  } else {
    tandaRepo.updateTanda(tandaId, { currentRound: currentRound + 1 }, db);
  }

  return tandaRepo.findTandaById(tandaId, db)!;
}
