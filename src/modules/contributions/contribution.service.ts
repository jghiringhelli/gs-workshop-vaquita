import { z } from 'zod';
import * as contributionRepo from './contribution.repository';
import * as participantRepo from '../participants/participant.repository';
import * as tandaRepo from '../tandas/tanda.repository';
import { config } from '../../config';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError';

export const RecordContributionSchema = z.object({
  participantId: z.string().uuid(),
  amount: z.number().positive(),
});

export function recordContribution(tandaId: string, participantId: string, amount: number) {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.status !== 'active') throw new ValidationError('Tanda is not active');

  const participant = participantRepo.findParticipantById(participantId);
  if (!participant) throw new NotFoundError('Participant', participantId);
  if (participant.tandaId !== tandaId) throw new ValidationError('Participant does not belong to this tanda');

  const existing = contributionRepo.findContributionByParticipantAndRound(participantId, tanda.currentRound);
  if (existing) throw new ConflictError('Contribution already recorded for this participant in this round');

  return contributionRepo.createContribution(tandaId, participantId, tanda.currentRound, amount, 'paid');
}

export function advanceTanda(tandaId: string, organizerId: string) {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.organizerId !== organizerId) throw new ForbiddenError('Only the organizer can advance rounds');
  if (tanda.status !== 'active') throw new ValidationError('Tanda is not active');

  const participants = participantRepo.listParticipantsByTanda(tandaId);
  const roundContributions = contributionRepo.listContributionsByRound(tandaId, tanda.currentRound);
  const paidParticipantIds = new Set(roundContributions.map(c => c.participantId));

  for (const participant of participants) {
    if (!paidParticipantIds.has(participant.id)) {
      contributionRepo.createContribution(
        tandaId,
        participant.id,
        tanda.currentRound,
        tanda.contributionAmount,
        'missed'
      );
      const newConsecutive = participant.consecutiveMissed + 1;
      const isDefaulter = newConsecutive >= config.tanda.maxConsecutiveMissed;
      participantRepo.updateParticipantDefaulter(participant.id, isDefaulter, newConsecutive);
    } else {
      participantRepo.resetConsecutiveMissed(participant.id);
    }
  }

  if (tanda.currentRound === tanda.totalRounds) {
    tandaRepo.updateTandaStatus(tandaId, 'completed');
  } else {
    tandaRepo.incrementTandaRound(tandaId);
  }

  return tandaRepo.findTandaById(tandaId)!;
}

export function getRoundSummary(tandaId: string, round: number) {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);

  const contributions = contributionRepo.listContributionsByRound(tandaId, round);
  const enriched = contributions.map(c => {
    const participant = participantRepo.findParticipantById(c.participantId);
    return { ...c, participant };
  });

  return { round, tanda, contributions: enriched };
}

export function getParticipantHistory(tandaId: string, participantId: string) {
  const tanda = tandaRepo.findTandaById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);

  const participant = participantRepo.findParticipantById(participantId);
  if (!participant) throw new NotFoundError('Participant', participantId);
  if (participant.tandaId !== tandaId) throw new ValidationError('Participant does not belong to this tanda');

  return contributionRepo.listContributionsByParticipantInTanda(participantId, tandaId);
}
