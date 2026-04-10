import * as tandasRepo from '../repositories/tandas.repository';
import * as participantsRepo from '../repositories/participants.repository';
import * as contributionsRepo from '../repositories/contributions.repository';
import * as usersRepo from '../repositories/users.repository';
import { Tanda, Participant, Contribution } from '../types';
import { config } from '../config';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
  UnprocessableError,
} from '../errors';

export function createTanda(name: string, organizerId: number, contributionAmount: number): Tanda {
  if (!name || !organizerId || !contributionAmount) {
    throw new ValidationError('Name, organizerId, and contributionAmount are required');
  }
  if (contributionAmount <= 0) {
    throw new ValidationError('Contribution amount must be positive');
  }

  const organizer = usersRepo.findUserById(organizerId);
  if (!organizer) {
    throw new NotFoundError('Organizer user not found');
  }

  const tanda = tandasRepo.createTanda(name, organizerId, contributionAmount);
  participantsRepo.addParticipant(organizerId, tanda.id, 'organizer');

  return tanda;
}

export function getTandaById(id: number): Tanda {
  const tanda = tandasRepo.findTandaById(id);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }
  return tanda;
}

export function getTandas(userId?: number): Tanda[] {
  if (userId) {
    return tandasRepo.findTandasByUserId(userId);
  }
  return tandasRepo.findAllTandas();
}

export function joinTanda(tandaId: number, userId: number): Participant {
  const tanda = tandasRepo.findTandaById(tandaId);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }

  if (tanda.status !== 'forming') {
    throw new ConflictError('Tanda is not in forming status');
  }

  const user = usersRepo.findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const existing = participantsRepo.findParticipantByUserAndTanda(userId, tandaId);
  if (existing) {
    throw new ConflictError('User already joined this tanda');
  }

  const count = participantsRepo.countParticipants(tandaId);
  if (count >= config.MAX_PARTICIPANTS) {
    throw new ValidationError(`Tanda already has the maximum of ${config.MAX_PARTICIPANTS} participants`);
  }

  return participantsRepo.addParticipant(userId, tandaId, 'member');
}

export function startTanda(tandaId: number, organizerId: number): Tanda {
  const tanda = tandasRepo.findTandaById(tandaId);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }

  if (tanda.organizerId !== organizerId) {
    throw new ForbiddenError('Only the organizer can start the tanda');
  }

  if (tanda.status !== 'forming') {
    throw new ConflictError('Tanda is not in forming status');
  }

  const participants = participantsRepo.findParticipantsByTandaId(tandaId);
  if (participants.length < config.MIN_PARTICIPANTS) {
    throw new ValidationError(`At least ${config.MIN_PARTICIPANTS} participants are required to start`);
  }

  // Randomize rotation order
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  shuffled.forEach((p, index) => {
    participantsRepo.updateRotationPosition(p.id, index + 1);
  });

  tandasRepo.startTanda(tandaId, participants.length);

  return tandasRepo.findTandaById(tandaId)!;
}

export function cancelTanda(tandaId: number, organizerId: number): Tanda {
  const tanda = tandasRepo.findTandaById(tandaId);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }

  if (tanda.organizerId !== organizerId) {
    throw new ForbiddenError('Only the organizer can cancel the tanda');
  }

  if (tanda.status === 'completed' || tanda.status === 'cancelled') {
    throw new ConflictError('Tanda is already completed or cancelled');
  }

  tandasRepo.updateTandaStatus(tandaId, 'cancelled');
  return tandasRepo.findTandaById(tandaId)!;
}

export function getParticipants(tandaId: number): Participant[] {
  const tanda = tandasRepo.findTandaById(tandaId);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }
  return participantsRepo.findParticipantsByTandaId(tandaId);
}

export function recordContribution(
  tandaId: number,
  participantId: number,
  amount: number,
  isLate: boolean = false
): Contribution {
  const tanda = tandasRepo.findTandaById(tandaId);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }

  if (tanda.status !== 'active') {
    throw new UnprocessableError('Tanda is not active');
  }

  const participant = participantsRepo.findParticipantById(participantId);
  if (!participant || participant.tandaId !== tandaId) {
    throw new NotFoundError('Participant not found in this tanda');
  }

  if (amount !== tanda.contributionAmount) {
    throw new ValidationError(`Contribution amount must be ${tanda.contributionAmount}`);
  }

  const existing = contributionsRepo.findContributionByParticipantAndRound(participantId, tanda.currentRound);
  if (existing) {
    throw new ConflictError('Contribution already recorded for this round');
  }

  let finalAmount = amount;
  let status: 'paid' | 'late' = 'paid';

  if (isLate) {
    finalAmount = amount * (1 + config.LATE_PENALTY_RATE);
    status = 'late';
  }

  return contributionsRepo.createContribution(tandaId, participantId, tanda.currentRound, finalAmount, status);
}

export function getRoundSummary(tandaId: number, round: number) {
  const tanda = tandasRepo.findTandaById(tandaId);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }

  if (round < 1 || round > tanda.totalRounds) {
    throw new NotFoundError('Round not found');
  }

  const contributions = contributionsRepo.findContributionsByRound(tandaId, round);
  const participants = participantsRepo.findParticipantsByTandaId(tandaId);
  const recipient = participants.find(p => p.rotationPosition === round);

  return {
    round,
    tandaId,
    recipientParticipantId: recipient?.id || null,
    contributions,
    totalCollected: contributions
      .filter(c => c.status === 'paid' || c.status === 'late')
      .reduce((sum, c) => sum + c.amount, 0),
  };
}

export function advanceRound(tandaId: number, organizerId: number): Tanda {
  const tanda = tandasRepo.findTandaById(tandaId);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }

  if (tanda.organizerId !== organizerId) {
    throw new ForbiddenError('Only the organizer can advance the round');
  }

  if (tanda.status !== 'active') {
    throw new ConflictError('Tanda is not active');
  }

  // Mark missing contributions as missed
  const participants = participantsRepo.findParticipantsByTandaId(tandaId);
  for (const p of participants) {
    const contribution = contributionsRepo.findContributionByParticipantAndRound(p.id, tanda.currentRound);
    if (!contribution) {
      contributionsRepo.createContribution(tandaId, p.id, tanda.currentRound, 0, 'missed');
    }
  }

  // Check if this was the last round → auto-complete
  if (tanda.currentRound >= tanda.totalRounds) {
    tandasRepo.updateTandaStatus(tandaId, 'completed');
  } else {
    tandasRepo.updateTandaRound(tandaId, tanda.currentRound + 1);
  }

  return tandasRepo.findTandaById(tandaId)!;
}

export function getParticipantHistory(tandaId: number, participantId: number): Contribution[] {
  const tanda = tandasRepo.findTandaById(tandaId);
  if (!tanda) {
    throw new NotFoundError('Tanda not found');
  }

  const participant = participantsRepo.findParticipantById(participantId);
  if (!participant || participant.tandaId !== tandaId) {
    throw new NotFoundError('Participant not found in this tanda');
  }

  return contributionsRepo.findContributionsByParticipant(participantId);
}
