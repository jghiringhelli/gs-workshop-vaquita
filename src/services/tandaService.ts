import { config } from '../config';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../errors';
import { ParticipantRepository } from '../repositories/participantRepository';
import { TandaRepository } from '../repositories/tandaRepository';
import { UserRepository } from '../repositories/userRepository';

export function createTandaService(
  tandaRepo: TandaRepository,
  participantRepo: ParticipantRepository,
  userRepo: UserRepository
) {
  return {
    async createTanda(data: {
      name: string;
      organizerId: number;
      contributionAmount: number;
    }) {
      const organizer = userRepo.findById(data.organizerId);
      if (!organizer) {
        throw new NotFoundError(`User ${data.organizerId} not found`);
      }

      const tanda = tandaRepo.create(data);

      // Auto-join organizer as first participant
      participantRepo.create({
        userId: data.organizerId,
        tandaId: tanda.id,
        role: 'organizer',
      });

      return tanda;
    },

    async getTanda(id: number) {
      const tanda = tandaRepo.findById(id);
      if (!tanda) {
        throw new NotFoundError(`Tanda ${id} not found`);
      }
      return tanda;
    },

    async listTandas(userId?: number) {
      return tandaRepo.findAll(userId);
    },

    async joinTanda(tandaId: number, userId: number) {
      const tanda = tandaRepo.findById(tandaId);
      if (!tanda) {
        throw new NotFoundError(`Tanda ${tandaId} not found`);
      }

      if (tanda.status !== 'forming') {
        throw new BusinessRuleError('Can only join a tanda in forming status');
      }

      const user = userRepo.findById(userId);
      if (!user) {
        throw new NotFoundError(`User ${userId} not found`);
      }

      const existing = participantRepo.findByUserAndTanda(userId, tandaId);
      if (existing) {
        throw new ConflictError('User is already a participant in this tanda');
      }

      const count = participantRepo.countByTanda(tandaId);
      if (count >= config.maxParticipants) {
        throw new BusinessRuleError(
          `Tanda has reached maximum participants (${config.maxParticipants})`
        );
      }

      return participantRepo.create({ userId, tandaId, role: 'member' });
    },

    async startTanda(tandaId: number, requesterId: number) {
      const tanda = tandaRepo.findById(tandaId);
      if (!tanda) {
        throw new NotFoundError(`Tanda ${tandaId} not found`);
      }

      if (tanda.organizerId !== requesterId) {
        throw new ForbiddenError('Only the organizer can start the tanda');
      }

      if (tanda.status !== 'forming') {
        throw new BusinessRuleError(`Tanda cannot be started from status '${tanda.status}'`);
      }

      const count = participantRepo.countByTanda(tandaId);
      if (count < config.minParticipants) {
        throw new BusinessRuleError(
          `Tanda needs at least ${config.minParticipants} participants to start`
        );
      }

      // Randomize rotation order
      const participants = participantRepo.findByTanda(tandaId);
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const positions = shuffled.map((p, i) => ({ id: p.id, position: i + 1 }));
      participantRepo.assignRotationPositions(tandaId, positions);

      return tandaRepo.updateRound(tandaId, 1, count)
        ? tandaRepo.updateStatus(tandaId, 'active')
        : undefined;
    },

    async cancelTanda(tandaId: number, requesterId: number) {
      const tanda = tandaRepo.findById(tandaId);
      if (!tanda) {
        throw new NotFoundError(`Tanda ${tandaId} not found`);
      }

      if (tanda.organizerId !== requesterId) {
        throw new ForbiddenError('Only the organizer can cancel the tanda');
      }

      if (tanda.status === 'completed' || tanda.status === 'cancelled') {
        throw new BusinessRuleError(`Tanda is already ${tanda.status}`);
      }

      return tandaRepo.updateStatus(tandaId, 'cancelled');
    },

    async listParticipants(tandaId: number) {
      const tanda = tandaRepo.findById(tandaId);
      if (!tanda) {
        throw new NotFoundError(`Tanda ${tandaId} not found`);
      }
      return participantRepo.findByTanda(tandaId);
    },

    async advanceRound(tandaId: number, requesterId: number) {
      const tanda = tandaRepo.findById(tandaId);
      if (!tanda) {
        throw new NotFoundError(`Tanda ${tandaId} not found`);
      }

      if (tanda.organizerId !== requesterId) {
        throw new ForbiddenError('Only the organizer can advance the round');
      }

      if (tanda.status !== 'active') {
        throw new BusinessRuleError('Tanda must be active to advance rounds');
      }

      const nextRound = tanda.currentRound + 1;

      if (nextRound > tanda.totalRounds) {
        return tandaRepo.updateStatus(tandaId, 'completed');
      }

      return tandaRepo.updateRound(tandaId, nextRound);
    },
  };
}

export type TandaService = ReturnType<typeof createTandaService>;
