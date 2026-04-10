import { z } from 'zod';
import * as tandasRepo from '../repositories/tandas.repository';
import * as participantsRepo from '../repositories/participants.repository';
import * as contributionsRepo from '../repositories/contributions.repository';
import * as usersRepo from '../repositories/users.repository';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
  UnprocessableError,
} from '../errors';
import { MAX_PARTICIPANTS, MIN_PARTICIPANTS } from '../config';
import type { Tanda, Participant, Contribution } from '../types';

// ─── Schemas ────────────────────────────────────────────────────────────────

const CreateTandaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  organizerId: z.number().int().positive(),
  contributionAmount: z.number().positive(),
});

const JoinTandaSchema = z.object({
  userId: z.number().int().positive(),
});

const OrganizerActionSchema = z.object({
  organizerId: z.number().int().positive(),
});

const ContributionSchema = z.object({
  participantId: z.number().int().positive(),
  amount: z.number().positive(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireTanda(id: number): Tanda {
  const tanda = tandasRepo.findTandaById(id);
  if (!tanda) throw new NotFoundError(`Tanda ${id} not found`);
  return tanda;
}

function requireOrganizer(tanda: Tanda, requesterId: number): void {
  if (tanda.organizerId !== requesterId)
    throw new ForbiddenError('Only the organizer can perform this action');
}

// ─── Service functions ────────────────────────────────────────────────────────

export function createTanda(data: unknown): Tanda {
  const { name, organizerId, contributionAmount } = CreateTandaSchema.parse(data);
  const user = usersRepo.findUserById(organizerId);
  if (!user) throw new NotFoundError(`User ${organizerId} not found`);
  const tanda = tandasRepo.createTanda(name, organizerId, contributionAmount);
  participantsRepo.addParticipant(tanda.id, organizerId, 'organizer');
  return tanda;
}

export function listTandasForUser(userId: number): Tanda[] {
  const user = usersRepo.findUserById(userId);
  if (!user) throw new NotFoundError(`User ${userId} not found`);
  return tandasRepo.listTandasForUser(userId);
}

export function getTandaById(id: number): Tanda {
  return requireTanda(id);
}

export function joinTanda(tandaId: number, data: unknown): Participant {
  const { userId } = JoinTandaSchema.parse(data);
  const tanda = requireTanda(tandaId);

  if (tanda.status !== 'forming')
    throw new UnprocessableError('Cannot join a tanda that is not forming');

  const user = usersRepo.findUserById(userId);
  if (!user) throw new NotFoundError(`User ${userId} not found`);

  const existing = participantsRepo.findParticipant(tandaId, userId);
  if (existing) throw new ConflictError('User is already a participant');

  const participants = participantsRepo.listParticipants(tandaId);
  if (participants.length >= MAX_PARTICIPANTS)
    throw new UnprocessableError(`Tanda is full (max ${MAX_PARTICIPANTS} participants)`);

  return participantsRepo.addParticipant(tandaId, userId, 'member');
}

export function startTanda(tandaId: number, data: unknown): Tanda {
  const { organizerId } = OrganizerActionSchema.parse(data);
  const tanda = requireTanda(tandaId);
  requireOrganizer(tanda, organizerId);

  if (tanda.status !== 'forming')
    throw new UnprocessableError('Tanda is not in forming status');

  const participants = participantsRepo.listParticipants(tandaId);
  if (participants.length < MIN_PARTICIPANTS)
    throw new ValidationError(
      `Tanda needs at least ${MIN_PARTICIPANTS} participants to start (has ${participants.length})`,
    );

  // Randomise rotation positions (Fisher-Yates)
  const positions = participants.map((_, i) => i + 1);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  for (let i = 0; i < participants.length; i++) {
    participantsRepo.setRotationPosition(participants[i].id, positions[i]);
  }

  const totalRounds = participants.length;
  tandasRepo.updateTandaRound(tandaId, 1, totalRounds, 'active');

  return tandasRepo.findTandaById(tandaId) as Tanda;
}

export function cancelTanda(tandaId: number, data: unknown): Tanda {
  const { organizerId } = OrganizerActionSchema.parse(data);
  const tanda = requireTanda(tandaId);
  requireOrganizer(tanda, organizerId);

  if (tanda.status === 'completed' || tanda.status === 'cancelled')
    throw new UnprocessableError(`Tanda is already ${tanda.status}`);

  tandasRepo.updateTandaStatus(tandaId, 'cancelled');
  return tandasRepo.findTandaById(tandaId) as Tanda;
}

export function listParticipants(tandaId: number): Participant[] {
  requireTanda(tandaId);
  return participantsRepo.listParticipants(tandaId);
}

export function recordContribution(tandaId: number, data: unknown): Contribution {
  const { participantId, amount } = ContributionSchema.parse(data);
  const tanda = requireTanda(tandaId);

  if (tanda.status !== 'active')
    throw new UnprocessableError('Contributions can only be recorded for active tandas');

  const participant = participantsRepo.findParticipantById(participantId);
  if (!participant) throw new NotFoundError(`Participant ${participantId} not found`);
  if (participant.tandaId !== tandaId)
    throw new ValidationError('Participant does not belong to this tanda');

  const existing = contributionsRepo.findContribution(participantId, tanda.currentRound);
  if (existing) throw new ConflictError('Contribution already recorded for this round');

  // Determine status: if amount < full contribution, it is a late/partial payment
  const isLate = amount < tanda.contributionAmount;
  const status = isLate ? 'late' : 'paid';

  return contributionsRepo.createContribution(
    tandaId,
    participantId,
    tanda.currentRound,
    amount,
    status,
  );
}

export interface RoundSummary {
  round: number;
  totalRounds: number;
  potRecipient: Participant | null;
  contributions: Contribution[];
  paidCount: number;
  totalParticipants: number;
}

export function getRoundSummary(tandaId: number, round: number): RoundSummary {
  const tanda = requireTanda(tandaId);

  if (round < 1 || round > tanda.totalRounds)
    throw new ValidationError(`Invalid round ${round} — tanda has ${tanda.totalRounds} rounds`);

  const participants = participantsRepo.listParticipants(tandaId);
  const contributions = contributionsRepo.listContributionsForRound(tandaId, round);
  const potRecipient = participants.find((p) => p.rotationPosition === round) ?? null;
  const paidCount = contributions.filter((c) => c.status === 'paid' || c.status === 'late').length;

  return {
    round,
    totalRounds: tanda.totalRounds,
    potRecipient,
    contributions,
    paidCount,
    totalParticipants: participants.length,
  };
}

export function advanceRound(tandaId: number, data: unknown): Tanda {
  const { organizerId } = OrganizerActionSchema.parse(data);
  const tanda = requireTanda(tandaId);
  requireOrganizer(tanda, organizerId);

  if (tanda.status !== 'active')
    throw new UnprocessableError('Can only advance an active tanda');

  const participants = participantsRepo.listParticipants(tandaId);
  const currentRound = tanda.currentRound;

  // Mark participants who have not contributed as 'missed'
  for (const p of participants) {
    const contrib = contributionsRepo.findContribution(p.id, currentRound);
    if (!contrib) {
      contributionsRepo.createContribution(tandaId, p.id, currentRound, 0, 'missed');

      // Check consecutive misses for defaulter flag (2 consecutive missed)
      const missedInLast2 = contributionsRepo.getConsecutiveMissedCount(p.id, currentRound + 1);
      if (missedInLast2 >= 2) {
        participantsRepo.markDefaulter(p.id);
      }
    }
  }

  const nextRound = currentRound + 1;
  const isLastRound = currentRound >= tanda.totalRounds;
  const newStatus = isLastRound ? 'completed' : 'active';

  tandasRepo.advanceTandaRound(tandaId, nextRound, newStatus);
  return tandasRepo.findTandaById(tandaId) as Tanda;
}

export function getParticipantHistory(
  tandaId: number,
  participantId: number,
): Contribution[] {
  requireTanda(tandaId);
  const participant = participantsRepo.findParticipantById(participantId);
  if (!participant) throw new NotFoundError(`Participant ${participantId} not found`);
  if (participant.tandaId !== tandaId)
    throw new ValidationError('Participant does not belong to this tanda');
  return contributionsRepo.listContributionsForParticipant(participantId);
}
