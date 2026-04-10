import { z } from 'zod';
import { config } from '../config';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors';
import * as contributionRepo from '../repositories/contributionRepository';
import * as participantRepo from '../repositories/participantRepository';
import * as tandaRepo from '../repositories/tandaRepository';
import * as userRepo from '../repositories/userRepository';

// ── Schemas ──────────────────────────────────────────────────────────────────

export const CreateTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.number().int().positive(),
  contributionAmount: z.number().positive(),
});

export const JoinTandaSchema = z.object({
  userId: z.number().int().positive(),
});

export const RecordContributionSchema = z.object({
  participantId: z.number().int().positive(),
  amount: z.number().positive(),
});

export type CreateTandaInput = z.infer<typeof CreateTandaSchema>;
export type JoinTandaInput = z.infer<typeof JoinTandaSchema>;
export type RecordContributionInput = z.infer<typeof RecordContributionSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireTanda(id: number) {
  const tanda = tandaRepo.getTandaById(id);
  if (!tanda) throw new NotFoundError('Tanda not found');
  return tanda;
}

function requireParticipant(userId: number, tandaId: number) {
  const p = participantRepo.getParticipant(userId, tandaId);
  if (!p) throw new ForbiddenError('You are not a participant of this tanda');
  return p;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Service functions ─────────────────────────────────────────────────────────

export function createTanda(input: CreateTandaInput) {
  const organizer = userRepo.getUserById(input.organizerId);
  if (!organizer) throw new NotFoundError('Organizer user not found');

  const tanda = tandaRepo.createTanda(input.name, input.organizerId, input.contributionAmount);
  participantRepo.addParticipant(input.organizerId, tanda.id, 'organizer');
  return tanda;
}

export function listTandas(userId: number) {
  const user = userRepo.getUserById(userId);
  if (!user) throw new NotFoundError('User not found');
  return tandaRepo.listTandasForUser(userId);
}

export function getTanda(id: number) {
  return requireTanda(id);
}

export function joinTanda(tandaId: number, input: JoinTandaInput) {
  const tanda = requireTanda(tandaId);
  if (tanda.status !== 'forming') {
    throw new ValidationError('Tanda is not accepting new members');
  }

  const user = userRepo.getUserById(input.userId);
  if (!user) throw new NotFoundError('User not found');

  const existing = participantRepo.getParticipant(input.userId, tandaId);
  if (existing) throw new ConflictError('User is already a participant');

  const count = participantRepo.countParticipants(tandaId);
  if (count >= config.maxParticipants) {
    throw new ValidationError(`Tanda is full (max ${config.maxParticipants} participants)`);
  }

  return participantRepo.addParticipant(input.userId, tandaId, 'member');
}

export function startTanda(tandaId: number, requestingUserId: number) {
  const tanda = requireTanda(tandaId);
  if (tanda.status !== 'forming') {
    throw new ValidationError('Tanda is not in forming status');
  }

  const requester = requireParticipant(requestingUserId, tandaId);
  if (requester.role !== 'organizer') {
    throw new ForbiddenError('Only the organizer can start the tanda');
  }

  const participants = participantRepo.listParticipants(tandaId);
  if (participants.length < config.minParticipants) {
    throw new ValidationError(
      `Need at least ${config.minParticipants} participants to start (have ${participants.length})`
    );
  }

  const shuffled = shuffle(participants);
  participantRepo.assignRotationPositions(tandaId, shuffled.map((p) => p.id));
  tandaRepo.setTandaActive(tandaId, participants.length);

  return tandaRepo.getTandaById(tandaId)!;
}

export function cancelTanda(tandaId: number, requestingUserId: number) {
  const tanda = requireTanda(tandaId);
  if (tanda.status === 'completed' || tanda.status === 'cancelled') {
    throw new ValidationError(`Tanda is already ${tanda.status}`);
  }

  const requester = requireParticipant(requestingUserId, tandaId);
  if (requester.role !== 'organizer') {
    throw new ForbiddenError('Only the organizer can cancel the tanda');
  }

  tandaRepo.updateTandaStatus(tandaId, 'cancelled');
  return tandaRepo.getTandaById(tandaId)!;
}

export function listParticipants(tandaId: number) {
  requireTanda(tandaId);
  return participantRepo.listParticipants(tandaId);
}

export function recordContribution(tandaId: number, input: RecordContributionInput) {
  const tanda = requireTanda(tandaId);
  if (tanda.status !== 'active') {
    throw new ValidationError('Tanda is not active');
  }

  const participant = participantRepo.getParticipantById(input.participantId);
  if (!participant || participant.tandaId !== tandaId) {
    throw new NotFoundError('Participant not found in this tanda');
  }

  const existing = contributionRepo.getContribution(tandaId, input.participantId, tanda.currentRound);
  if (existing && existing.status !== 'missed') {
    throw new ConflictError('Contribution already recorded for this round');
  }

  const isLate = input.amount < tanda.contributionAmount;
  const status = isLate ? 'late' : 'paid';

  participantRepo.resetConsecutiveMissed(input.participantId);

  return contributionRepo.recordContribution(
    tandaId,
    input.participantId,
    tanda.currentRound,
    input.amount,
    status
  );
}

export function getRoundSummary(tandaId: number, round: number) {
  const tanda = requireTanda(tandaId);
  if (round < 1 || round > tanda.totalRounds) {
    throw new ValidationError(`Invalid round number`);
  }

  const participants = participantRepo.listParticipants(tandaId);
  const contributions = contributionRepo.listContributionsByRound(tandaId, round);
  const recipient = participants.find((p) => p.rotationPosition === round);
  const totalCollected = contributions
    .filter((c) => c.status === 'paid' || c.status === 'late')
    .reduce((sum, c) => sum + c.amount, 0);

  return {
    round,
    tanda: { id: tanda.id, name: tanda.name, contributionAmount: tanda.contributionAmount },
    recipient: recipient ?? null,
    potAmount: tanda.contributionAmount * participants.length,
    totalCollected,
    contributions,
  };
}

export function advanceRound(tandaId: number, requestingUserId: number) {
  const tanda = requireTanda(tandaId);
  if (tanda.status !== 'active') {
    throw new ValidationError('Tanda is not active');
  }

  const requester = requireParticipant(requestingUserId, tandaId);
  if (requester.role !== 'organizer') {
    throw new ForbiddenError('Only the organizer can advance the round');
  }

  // Mark unpaid participants as missed and update defaulter flags
  const participants = participantRepo.listParticipants(tandaId);
  const contributions = contributionRepo.listContributionsByRound(tandaId, tanda.currentRound);
  const paidIds = new Set(
    contributions.filter((c) => c.status === 'paid' || c.status === 'late').map((c) => c.participantId)
  );
  const unpaidIds = participants.filter((p) => !paidIds.has(p.id)).map((p) => p.id);

  contributionRepo.markMissedContributions(tandaId, unpaidIds, tanda.currentRound, tanda.contributionAmount);

  for (const p of participants) {
    if (!paidIds.has(p.id)) {
      const consecutive = p.consecutiveMissed + 1;
      const isDefaulter = consecutive >= config.maxConsecutiveMissed;
      participantRepo.updateConsecutiveMissed(p.id, consecutive, isDefaulter);
    }
  }

  if (tanda.currentRound >= tanda.totalRounds) {
    tandaRepo.completeTanda(tandaId);
    return tandaRepo.getTandaById(tandaId)!;
  }

  tandaRepo.advanceTandaRound(tandaId, tanda.currentRound + 1);
  return tandaRepo.getTandaById(tandaId)!;
}

export function getParticipantHistory(tandaId: number, participantId: number) {
  requireTanda(tandaId);
  const participant = participantRepo.getParticipantById(participantId);
  if (!participant || participant.tandaId !== tandaId) {
    throw new NotFoundError('Participant not found in this tanda');
  }
  return contributionRepo.listContributionsByParticipant(participantId);
}
