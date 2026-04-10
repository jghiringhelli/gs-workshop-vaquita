import { tandaRepo } from '../repositories/tandaRepo';
import { userRepo } from '../repositories/userRepo';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../errors';
import { config } from '../config';
import { z } from 'zod';

const createTandaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  organizerId: z.number().int().positive(),
  contributionAmount: z.number().positive(),
});

const joinTandaSchema = z.object({
  userId: z.number().int().positive(),
});

const contributionSchema = z.object({
  participantId: z.number().int().positive(),
  amount: z.number().positive(),
});

export const tandaService = {
  create(data: unknown) {
    const { name, organizerId, contributionAmount } = createTandaSchema.parse(data);
    const user = userRepo.findById(organizerId);
    if (!user) throw new NotFoundError('User not found');

    const tanda = tandaRepo.create(name, organizerId, contributionAmount);
    tandaRepo.addParticipant(organizerId, tanda.id, 'organizer');
    return tanda;
  },

  getAll(userId?: number) {
    if (userId) return tandaRepo.findByUserId(userId);
    return tandaRepo.findAll();
  },

  getById(id: number) {
    const tanda = tandaRepo.findById(id);
    if (!tanda) throw new NotFoundError('Tanda not found');
    return tanda;
  },

  join(tandaId: number, data: unknown) {
    const { userId } = joinTandaSchema.parse(data);
    const tanda = tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    if (tanda.status !== 'forming') throw new ValidationError('Tanda is not accepting new members');

    const user = userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const existing = tandaRepo.findParticipant(userId, tandaId);
    if (existing) throw new ConflictError('User already joined this tanda');

    const count = tandaRepo.countParticipants(tandaId);
    if (count >= config.maxParticipants) throw new ValidationError('Tanda is full');

    return tandaRepo.addParticipant(userId, tandaId, 'member');
  },

  start(tandaId: number, userId: number) {
    const tanda = tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    if (tanda.organizerId !== userId) throw new ForbiddenError('Only the organizer can start the tanda');
    if (tanda.status !== 'forming') throw new ValidationError('Tanda is not in forming status');

    const count = tandaRepo.countParticipants(tandaId);
    if (count < config.minParticipants) {
      throw new ValidationError(`At least ${config.minParticipants} participants required`);
    }

    // Randomize rotation order
    const participants = tandaRepo.getParticipants(tandaId);
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const positions = shuffled.map((p, i) => ({ id: p.id, position: i + 1 }));
    tandaRepo.setRotationPositions(positions);

    tandaRepo.setTotalRounds(tandaId, count);
    tandaRepo.updateRound(tandaId, 1);
    tandaRepo.updateStatus(tandaId, 'active');

    return tandaRepo.findById(tandaId)!;
  },

  cancel(tandaId: number, userId: number) {
    const tanda = tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    if (tanda.organizerId !== userId) throw new ForbiddenError('Only the organizer can cancel the tanda');
    if (tanda.status === 'completed' || tanda.status === 'cancelled') {
      throw new ValidationError('Tanda is already completed or cancelled');
    }

    tandaRepo.updateStatus(tandaId, 'cancelled');
    return tandaRepo.findById(tandaId)!;
  },

  getParticipants(tandaId: number) {
    const tanda = tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    return tandaRepo.getParticipants(tandaId);
  },

  recordContribution(tandaId: number, data: unknown) {
    const { participantId, amount } = contributionSchema.parse(data);
    const tanda = tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    if (tanda.status !== 'active') throw new ValidationError('Tanda is not active');

    const participant = tandaRepo.findParticipantById(participantId);
    if (!participant || participant.tandaId !== tandaId) {
      throw new NotFoundError('Participant not found in this tanda');
    }

    const existing = tandaRepo.findContribution(participantId, tanda.currentRound);
    if (existing) throw new ConflictError('Contribution already recorded for this round');

    if (amount < tanda.contributionAmount) {
      throw new ValidationError(`Amount must be at least ${tanda.contributionAmount}`);
    }

    return tandaRepo.addContribution(tandaId, participantId, tanda.currentRound, amount, 'paid');
  },

  getRoundSummary(tandaId: number, round: number) {
    const tanda = tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    if (round < 1 || round > tanda.totalRounds) throw new ValidationError('Invalid round number');

    const contributions = tandaRepo.getContributionsByRound(tandaId, round);
    const recipient = tandaRepo.getParticipantByRotation(tandaId, round);

    return {
      round,
      tandaId,
      recipientParticipantId: recipient?.id ?? null,
      recipientUserId: recipient?.userId ?? null,
      contributions,
    };
  },

  advance(tandaId: number, userId: number) {
    const tanda = tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');
    if (tanda.organizerId !== userId) throw new ForbiddenError('Only the organizer can advance the round');
    if (tanda.status !== 'active') throw new ValidationError('Tanda is not active');

    if (tanda.currentRound >= tanda.totalRounds) {
      tandaRepo.updateStatus(tandaId, 'completed');
      return tandaRepo.findById(tandaId)!;
    }

    const nextRound = tanda.currentRound + 1;
    tandaRepo.updateRound(tandaId, nextRound);

    if (nextRound >= tanda.totalRounds) {
      // Last round reached — will auto-complete on next advance
    }

    return tandaRepo.findById(tandaId)!;
  },

  getContributionHistory(tandaId: number, participantId: number) {
    const tanda = tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda not found');

    const participant = tandaRepo.findParticipantById(participantId);
    if (!participant || participant.tandaId !== tandaId) {
      throw new NotFoundError('Participant not found in this tanda');
    }

    return tandaRepo.getContributionHistory(participantId);
  },
};
