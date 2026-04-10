import { contributionRepository } from '../repositories/contributionRepository';
import { participantRepository } from '../repositories/participantRepository';
import { tandaRepository } from '../repositories/tandaRepository';
import { config } from '../config';
import { ConflictError, NotFoundError, UnprocessableError, ValidationError } from '../errors';

export const contributionService = {
  recordContribution(tandaId: string, participantId: string, amount: number, isLate = false) {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda');
    if (tanda.status !== 'active') throw new UnprocessableError('Tanda is not active');

    const participant = participantRepository.findById(participantId);
    if (!participant || participant.tanda_id !== tandaId) {
      throw new NotFoundError('Participant');
    }

    const existing = contributionRepository.findByParticipantAndRound(participantId, tanda.current_round);
    if (existing && existing.status !== 'pending') {
      throw new ConflictError('Contribution already recorded for this round');
    }

    if (amount !== tanda.contribution_amount) {
      throw new ValidationError(
        `Amount must be ${tanda.contribution_amount}, got ${amount}`,
      );
    }

    let finalAmount = amount;
    let status: 'paid' | 'late' = 'paid';
    if (isLate) {
      finalAmount = amount * (1 + config.latePenaltyRate);
      status = 'late';
    }

    participantRepository.resetConsecutiveMisses(participantId);
    return contributionRepository.create(tandaId, participantId, tanda.current_round, finalAmount, status);
  },

  getRoundSummary(tandaId: string, round: number) {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda');

    const contributions = contributionRepository.findByTandaAndRound(tandaId, round);
    const participants = participantRepository.findByTanda(tandaId);

    const recipient = participants.find(p => p.rotation_position === round);

    return {
      round,
      recipient: recipient ?? null,
      contributions,
      totalCollected: contributions
        .filter(c => c.status === 'paid' || c.status === 'late')
        .reduce((sum, c) => sum + c.amount, 0),
    };
  },

  getParticipantHistory(tandaId: string, participantId: string) {
    const tanda = tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda');

    const participant = participantRepository.findById(participantId);
    if (!participant || participant.tanda_id !== tandaId) {
      throw new NotFoundError('Participant');
    }

    return contributionRepository.findByParticipant(participantId);
  },
};
