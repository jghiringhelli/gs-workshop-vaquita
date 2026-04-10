import { z } from 'zod';
import { config } from '../config';
import { ConflictError, NotFoundError, ValidationError } from '../errors';
import type { TandasRepository } from '../repositories/tandas.repository';
import type { ParticipantsRepository } from '../repositories/participants.repository';
import type { ContributionsRepository } from '../repositories/contributions.repository';

export const RecordContributionSchema = z.object({
  participantId: z.number().int().positive(),
  isLate: z.boolean().optional().default(false),
});

export function createContributionsService(
  tandasRepo: TandasRepository,
  participantsRepo: ParticipantsRepository,
  contributionsRepo: ContributionsRepository,
) {
  return {
    recordContribution(tandaId: number, data: unknown) {
      const { participantId, isLate } = RecordContributionSchema.parse(data);
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
      if (tanda.status !== 'active') throw new ValidationError('Tanda is not active');
      const participant = participantsRepo.findById(participantId);
      if (!participant || participant.tanda_id !== tandaId) {
        throw new NotFoundError(`Participant ${participantId} not found in tanda ${tandaId}`);
      }
      if (contributionsRepo.findByTandaParticipantRound(tandaId, participantId, tanda.current_round)) {
        throw new ConflictError('Contribution already recorded for this round');
      }
      const penalty = isLate ? tanda.contribution_amount * (config.LATE_PENALTY_PERCENT / 100) : 0;
      const amount = tanda.contribution_amount + penalty;
      return contributionsRepo.create(tandaId, participantId, tanda.current_round, amount, isLate ? 'late' : 'paid');
    },

    getRoundSummary(tandaId: number, round: number) {
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
      if (round < 1 || round > tanda.total_rounds) {
        throw new ValidationError(`Round ${round} is out of range`);
      }
      const contributions = contributionsRepo.findByTandaAndRound(tandaId, round);
      const participants = participantsRepo.findByTandaId(tandaId);
      const receiver = participants.find(p => p.rotation_position === round) ?? null;
      return {
        round,
        contributions,
        receiver,
        totalCollected: contributions.reduce((sum, c) => sum + c.amount, 0),
      };
    },

    getParticipantHistory(tandaId: number, participantId: number) {
      if (!tandasRepo.findById(tandaId)) throw new NotFoundError(`Tanda ${tandaId} not found`);
      const participant = participantsRepo.findById(participantId);
      if (!participant || participant.tanda_id !== tandaId) {
        throw new NotFoundError(`Participant ${participantId} not found in tanda ${tandaId}`);
      }
      return contributionsRepo.findByParticipant(participantId);
    },
  };
}

export type ContributionsService = ReturnType<typeof createContributionsService>;
