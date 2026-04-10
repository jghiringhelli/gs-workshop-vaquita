import * as tandaRepo from '../repositories/tanda.repository';
import * as participantRepo from '../repositories/participant.repository';
import * as userRepo from '../repositories/user.repository';
import { config } from '../config';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BusinessRuleError,
} from '../errors/errors';

export interface TandaResponse {
  id: number;
  name: string;
  organizerId: number;
  contributionAmount: number;
  status: string;
  currentRound: number;
  totalRounds: number;
}

export interface ParticipantResponse {
  id: number;
  userId: number;
  tandaId: number;
  role: string;
  rotationPosition: number | null;
}

function mapTanda(row: tandaRepo.TandaRow): TandaResponse {
  return {
    id: row.id,
    name: row.name,
    organizerId: row.organizer_id,
    contributionAmount: row.contribution_amount,
    status: row.status,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
  };
}

function mapParticipant(row: participantRepo.ParticipantRow): ParticipantResponse {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role,
    rotationPosition: row.rotation_position,
  };
}

function getTandaOrThrow(tandaId: number): tandaRepo.TandaRow {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }
  return tanda;
}

function assertOrganizer(tanda: tandaRepo.TandaRow, userId: number): void {
  if (tanda.organizer_id !== userId) {
    throw new ForbiddenError('Only the organizer can perform this action');
  }
}

export function createTanda(
  userId: number,
  name: string,
  contributionAmount: number,
  totalRounds?: number
): TandaResponse {
  const user = userRepo.findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const rounds = totalRounds ?? 0;
  const tanda = tandaRepo.createTanda(name, userId, contributionAmount, rounds);

  participantRepo.createParticipant(userId, tanda.id, 'organizer');

  return mapTanda(tanda);
}

export function getTandaById(tandaId: number): TandaResponse & { participants: ParticipantResponse[] } {
  const tanda = getTandaOrThrow(tandaId);
  const participants = participantRepo.findParticipantsByTandaId(tandaId).map(mapParticipant);

  return { ...mapTanda(tanda), participants };
}

export function listTandas(userId?: number): TandaResponse[] {
  if (userId) {
    return tandaRepo.findTandasByUserId(userId).map(mapTanda);
  }
  return tandaRepo.findAllTandas().map(mapTanda);
}

export function joinTanda(userId: number, tandaId: number): ParticipantResponse {
  const tanda = getTandaOrThrow(tandaId);

  if (tanda.status !== 'forming') {
    throw new BusinessRuleError('Can only join a tanda that is forming');
  }

  const existing = participantRepo.findParticipantByUserAndTanda(userId, tandaId);
  if (existing) {
    throw new ConflictError('User already joined this tanda');
  }

  const count = participantRepo.countParticipantsByTandaId(tandaId);
  if (count >= config.MAX_PARTICIPANTS) {
    throw new BusinessRuleError(`Tanda has reached the maximum of ${config.MAX_PARTICIPANTS} participants`);
  }

  const user = userRepo.findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const participant = participantRepo.createParticipant(userId, tandaId, 'member');
  return mapParticipant(participant);
}

export function startTanda(userId: number, tandaId: number): TandaResponse {
  const tanda = getTandaOrThrow(tandaId);
  assertOrganizer(tanda, userId);

  if (tanda.status !== 'forming') {
    throw new BusinessRuleError('Can only start a tanda that is forming');
  }

  const participants = participantRepo.findParticipantsByTandaId(tandaId);
  if (participants.length < config.MIN_PARTICIPANTS) {
    throw new BusinessRuleError(`Need at least ${config.MIN_PARTICIPANTS} participants to start`);
  }

  // Randomize rotation positions
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  shuffled.forEach((p, index) => {
    participantRepo.updateRotationPosition(p.id, index + 1);
  });

  const totalRounds = tanda.total_rounds > 0 ? tanda.total_rounds : participants.length;
  tandaRepo.updateTandaStatusAndRound(tandaId, 'active', 1);

  if (tanda.total_rounds === 0) {
    tandaRepo.updateTotalRounds(tandaId, totalRounds);
  }

  const updated = getTandaOrThrow(tandaId);
  return mapTanda(updated);
}

export function cancelTanda(userId: number, tandaId: number): TandaResponse {
  const tanda = getTandaOrThrow(tandaId);
  assertOrganizer(tanda, userId);

  if (tanda.status !== 'forming' && tanda.status !== 'active') {
    throw new BusinessRuleError('Can only cancel a tanda that is forming or active');
  }

  tandaRepo.updateTandaStatus(tandaId, 'cancelled');

  const updated = getTandaOrThrow(tandaId);
  return mapTanda(updated);
}

export function advanceRound(userId: number, tandaId: number): TandaResponse {
  const tanda = getTandaOrThrow(tandaId);
  assertOrganizer(tanda, userId);

  if (tanda.status !== 'active') {
    throw new BusinessRuleError('Can only advance rounds in an active tanda');
  }

  if (tanda.current_round >= tanda.total_rounds) {
    throw new BusinessRuleError('Tanda has already completed all rounds');
  }

  const nextRound = tanda.current_round + 1;

  if (nextRound >= tanda.total_rounds) {
    tandaRepo.updateTandaStatusAndRound(tandaId, 'completed', nextRound);
  } else {
    tandaRepo.updateTandaRound(tandaId, nextRound);
  }

  const updated = getTandaOrThrow(tandaId);
  return mapTanda(updated);
}

export function getParticipants(tandaId: number): ParticipantResponse[] {
  getTandaOrThrow(tandaId);
  return participantRepo.findParticipantsByTandaId(tandaId).map(mapParticipant);
}
