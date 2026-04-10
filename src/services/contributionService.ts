import { BusinessRuleError, NotFoundError } from '../errors';
import { ContributionRepository } from '../repositories/contributionRepository';
import { ParticipantRepository } from '../repositories/participantRepository';
import { TandaRepository } from '../repositories/tandaRepository';

export function createContributionService(
  contributionRepo: ContributionRepository,
  participantRepo: ParticipantRepository,
  tandaRepo: TandaRepository
) {
  return {
    async recordContribution(data: {
      tandaId: number;
      participantId: number;
      amount: number;
    }) {
      const tanda = tandaRepo.findById(data.tandaId);
      if (!tanda) {
        throw new NotFoundError(`Tanda ${data.tandaId} not found`);
      }

      if (tanda.status !== 'active') {
        throw new BusinessRuleError('Tanda must be active to record contributions');
      }

      const participant = participantRepo.findById(data.participantId);
      if (!participant) {
        throw new NotFoundError(`Participant ${data.participantId} not found`);
      }

      if (participant.tandaId !== data.tandaId) {
        throw new BusinessRuleError('Participant does not belong to this tanda');
      }

      const existing = contributionRepo.findByParticipantAndRound(
        data.participantId,
        tanda.currentRound
      );
      if (existing) {
        throw new BusinessRuleError('Contribution already recorded for this round');
      }

      return contributionRepo.create({
        tandaId: data.tandaId,
        participantId: data.participantId,
        round: tanda.currentRound,
        amount: data.amount,
        status: 'paid',
        paidAt: new Date().toISOString(),
      });
    },

    async getRoundSummary(tandaId: number, round: number) {
      const tanda = tandaRepo.findById(tandaId);
      if (!tanda) {
        throw new NotFoundError(`Tanda ${tandaId} not found`);
      }

      if (round < 1 || round > tanda.totalRounds) {
        throw new BusinessRuleError(`Round ${round} is not valid for this tanda`);
      }

      const contributions = contributionRepo.findByTandaAndRound(tandaId, round);
      const participants = participantRepo.findByTanda(tandaId);

      // Find the pot recipient: participant with rotationPosition === round
      const recipient = participants.find((p) => p.rotationPosition === round);

      // Enrich contributions with participant info
      const enrichedContributions = contributions.map((c) => {
        const participant = participants.find((p) => p.id === c.participantId);
        return { ...c, participant };
      });

      return {
        round,
        tandaId,
        contributions: enrichedContributions,
        potRecipient: recipient ?? null,
        pot: contributions.reduce((sum, c) => sum + c.amount, 0),
      };
    },

    async getParticipantHistory(tandaId: number, participantId: number) {
      const tanda = tandaRepo.findById(tandaId);
      if (!tanda) {
        throw new NotFoundError(`Tanda ${tandaId} not found`);
      }

      const participant = participantRepo.findById(participantId);
      if (!participant) {
        throw new NotFoundError(`Participant ${participantId} not found`);
      }

      if (participant.tandaId !== tandaId) {
        throw new BusinessRuleError('Participant does not belong to this tanda');
      }

      return contributionRepo.findByParticipant(participantId);
    },
  };
}

export type ContributionService = ReturnType<typeof createContributionService>;
