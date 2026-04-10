import * as contributionRepo from '../repositories/contributionRepository';
import * as participantRepo from '../repositories/participantRepository';
import * as tandaRepo from '../repositories/tandaRepository';
import { NotFoundError, ValidationError, ConflictError } from '../errors/AppError';
import { Contribution } from '../types';
import { config } from '../config';

export interface RoundSummary {
  round: number;
  contributions: Contribution[];
  totalCollected: number;
  expectedTotal: number;
  recipientParticipantId: number | null;
}

export function recordContribution(tandaId: number, participantId: number, amount: number): Contribution {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) {
    throw new NotFoundError(`Tanda with id ${tandaId} not found`);
  }
  if (tanda.status !== 'active') {
    throw new ValidationError('Tanda must be active to record contributions');
  }
  const participants = participantRepo.findByTandaId(tandaId);
  const participant = participants.find(p => p.id === participantId);
  if (!participant) {
    throw new NotFoundError(`Participant with id ${participantId} not found in tanda`);
  }

  const existing = contributionRepo.findByParticipantAndRound(participantId, tanda.currentRound);

  if (existing) {
    if (existing.status === 'missed') {
      // Late payment — apply 5% penalty
      const lateAmount = tanda.contributionAmount * (1 + config.latePenaltyRate);
      return contributionRepo.updateAmountAndStatus(existing.id, lateAmount, 'late');
    }
    throw new ConflictError('Contribution already recorded for this participant and round');
  }

  return contributionRepo.create({
    tandaId,
    participantId,
    round: tanda.currentRound,
    amount,
    status: 'paid',
  });
}

export function getRoundSummary(tandaId: number, round: number): RoundSummary {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) {
    throw new NotFoundError(`Tanda with id ${tandaId} not found`);
  }
  const contributions = contributionRepo.findByTandaAndRound(tandaId, round);
  const totalCollected = contributions.reduce((sum, c) => sum + c.amount, 0);
  const participants = participantRepo.findByTandaId(tandaId);
  const expectedTotal = tanda.contributionAmount * participants.length;
  const recipient = participants.find(p => p.rotationPosition === round);
  return {
    round,
    contributions,
    totalCollected,
    expectedTotal,
    recipientParticipantId: recipient ? recipient.id : null,
  };
}

export function getParticipantHistory(tandaId: number, participantId: number): Contribution[] {
  const participants = participantRepo.findByTandaId(tandaId);
  const participant = participants.find(p => p.id === participantId);
  if (!participant) {
    throw new NotFoundError(`Participant with id ${participantId} not found in tanda`);
  }
  return contributionRepo.findByParticipant(participantId);
}
