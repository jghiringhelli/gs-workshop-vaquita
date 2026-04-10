import { z } from 'zod';
import { config } from '../config';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors';
import type { TandasRepository } from '../repositories/tandas.repository';
import type { ParticipantsRepository } from '../repositories/participants.repository';
import type { UsersRepository } from '../repositories/users.repository';

export const CreateTandaSchema = z.object({
  name: z.string().min(1),
  organizerId: z.number().int().positive(),
  contributionAmount: z.number().positive(),
});

export const JoinTandaSchema = z.object({
  userId: z.number().int().positive(),
});

export const OrganizerActionSchema = z.object({
  organizerId: z.number().int().positive(),
});

export function createTandasService(
  tandasRepo: TandasRepository,
  participantsRepo: ParticipantsRepository,
  usersRepo: UsersRepository,
) {
  return {
    listTandas(userId?: number) {
      if (userId) return tandasRepo.findByUserId(userId);
      return tandasRepo.findAll();
    },

    getTandaById(id: number) {
      const tanda = tandasRepo.findById(id);
      if (!tanda) throw new NotFoundError(`Tanda ${id} not found`);
      return tanda;
    },

    createTanda(data: unknown) {
      const { name, organizerId, contributionAmount } = CreateTandaSchema.parse(data);
      if (!usersRepo.findById(organizerId)) throw new NotFoundError(`User ${organizerId} not found`);
      const tanda = tandasRepo.create(name, organizerId, contributionAmount);
      participantsRepo.create(organizerId, tanda.id, 'organizer');
      return tanda;
    },

    joinTanda(tandaId: number, data: unknown) {
      const { userId } = JoinTandaSchema.parse(data);
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
      if (tanda.status !== 'forming') throw new ValidationError('Tanda is not in forming status');
      if (!usersRepo.findById(userId)) throw new NotFoundError(`User ${userId} not found`);
      if (participantsRepo.findByTandaAndUser(tandaId, userId)) {
        throw new ConflictError('User already joined this tanda');
      }
      const count = participantsRepo.countByTanda(tandaId);
      if (count >= config.MAX_PARTICIPANTS) {
        throw new ValidationError(`Tanda is full (max ${config.MAX_PARTICIPANTS} participants)`);
      }
      return participantsRepo.create(userId, tandaId, 'member');
    },

    startTanda(tandaId: number, data: unknown) {
      const { organizerId } = OrganizerActionSchema.parse(data);
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
      if (tanda.status !== 'forming') throw new ValidationError('Tanda is not in forming status');
      if (tanda.organizer_id !== organizerId) throw new ForbiddenError('Only the organizer can start the tanda');
      const participants = participantsRepo.findByTandaId(tandaId);
      if (participants.length < config.MIN_PARTICIPANTS) {
        throw new ValidationError(`Tanda needs at least ${config.MIN_PARTICIPANTS} participants to start`);
      }
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      participantsRepo.setRotationPositions(shuffled.map((p, i) => ({ id: p.id, position: i + 1 })));
      tandasRepo.activateWithRound(tandaId, participants.length);
      return tandasRepo.findById(tandaId)!;
    },

    cancelTanda(tandaId: number, data: unknown) {
      const { organizerId } = OrganizerActionSchema.parse(data);
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
      if (tanda.organizer_id !== organizerId) throw new ForbiddenError('Only the organizer can cancel the tanda');
      if (tanda.status === 'completed' || tanda.status === 'cancelled') {
        throw new ValidationError(`Tanda is already ${tanda.status}`);
      }
      tandasRepo.updateStatus(tandaId, 'cancelled');
      return tandasRepo.findById(tandaId)!;
    },

    listParticipants(tandaId: number) {
      if (!tandasRepo.findById(tandaId)) throw new NotFoundError(`Tanda ${tandaId} not found`);
      return participantsRepo.findByTandaId(tandaId);
    },

    advanceRound(tandaId: number, data: unknown) {
      const { organizerId } = OrganizerActionSchema.parse(data);
      const tanda = tandasRepo.findById(tandaId);
      if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
      if (tanda.status !== 'active') throw new ValidationError('Tanda is not active');
      if (tanda.organizer_id !== organizerId) throw new ForbiddenError('Only the organizer can advance rounds');
      if (tanda.current_round >= tanda.total_rounds) {
        tandasRepo.updateStatus(tandaId, 'completed');
      } else {
        tandasRepo.advanceRound(tandaId, tanda.current_round + 1);
      }
      return tandasRepo.findById(tandaId)!;
    },
  };
}

export type TandasService = ReturnType<typeof createTandasService>;
