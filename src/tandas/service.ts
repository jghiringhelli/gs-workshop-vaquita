import { z } from 'zod';
import type { CreateTandaDto, JoinTandaDto, TandaResponse, ParticipantResponse } from './types';
import type { ITandaRepository } from '../repositories/tanda.repository';
import type { IParticipantRepository } from '../repositories/participant.repository';
import type { IUserRepository } from '../repositories/user.repository';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BusinessRuleError,
  ValidationError,
} from '../errors';
import { config } from '../config';

export const CreateTandaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  organizerId: z.string().min(1, 'organizerId is required'),
  contributionAmount: z.number({ invalid_type_error: 'contributionAmount must be a number' }).positive(),
});

export const JoinTandaSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

/** Returns a shuffled copy of the input array (Fisher-Yates). */
function shuffled<T>(arr: ReadonlyArray<T>): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}

/** Orchestrates tanda lifecycle: create, join, start, cancel, advance. */
export class TandaService {
  constructor(
    private readonly tandas: ITandaRepository,
    private readonly participants: IParticipantRepository,
    private readonly users: IUserRepository,
  ) {}

  /**
   * Creates a new tanda and auto-joins the organizer.
   * @param dto - Tanda creation data.
   * @returns Created tanda response.
   */
  create(dto: CreateTandaDto): TandaResponse {
    const parsed = CreateTandaSchema.safeParse(dto);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
    }
    if (!this.users.findById(dto.organizerId)) {
      throw new NotFoundError('User', dto.organizerId);
    }
    const tanda = this.tandas.create(dto);
    this.participants.create(dto.organizerId, tanda.id, 'organizer');
    return tanda;
  }

  /**
   * Lists all tandas a user participates in.
   * @param userId - User UUID.
   * @returns Array of tanda responses.
   */
  findByUserId(userId: string): ReadonlyArray<TandaResponse> {
    if (!this.users.findById(userId)) throw new NotFoundError('User', userId);
    return this.tandas.findByUserId(userId);
  }

  /**
   * Gets a tanda by ID.
   * @param id - Tanda UUID.
   * @returns Tanda response.
   */
  findById(id: string): TandaResponse {
    const tanda = this.tandas.findById(id);
    if (!tanda) throw new NotFoundError('Tanda', id);
    return tanda;
  }

  /**
   * Adds a user to a forming tanda.
   * @param tandaId - Tanda UUID.
   * @param dto - Join data containing userId.
   * @returns Created participant response.
   */
  join(tandaId: string, dto: JoinTandaDto): ParticipantResponse {
    const parsed = JoinTandaSchema.safeParse(dto);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
    }
    const tanda = this.tandas.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.status !== 'forming') {
      throw new BusinessRuleError('Can only join a tanda that is in forming status');
    }
    if (!this.users.findById(dto.userId)) throw new NotFoundError('User', dto.userId);
    if (this.participants.findByUserIdAndTandaId(dto.userId, tandaId)) {
      throw new ConflictError('User already joined this tanda');
    }
    if (this.participants.countByTandaId(tandaId) >= config.maxParticipants) {
      throw new BusinessRuleError(`Tanda has reached the maximum of ${config.maxParticipants} participants`);
    }
    return this.participants.create(dto.userId, tandaId, 'member');
  }

  /**
   * Starts a tanda (organizer only). Randomizes rotation and transitions to ACTIVE.
   * @param tandaId - Tanda UUID.
   * @param requesterId - UUID of the requesting user.
   * @returns Updated tanda response.
   */
  start(tandaId: string, requesterId: string): TandaResponse {
    const tanda = this.tandas.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.organizerId !== requesterId) throw new ForbiddenError('Only the organizer can start the tanda');
    if (tanda.status !== 'forming') throw new BusinessRuleError('Tanda must be in forming status to start');

    const count = this.participants.countByTandaId(tandaId);
    if (count < config.minParticipants) {
      throw new BusinessRuleError(`Tanda needs at least ${config.minParticipants} participants to start`);
    }

    const all = this.participants.findByTandaId(tandaId);
    const positions = shuffled(all).map((p, i) => ({ id: p.id, position: i + 1 }));
    this.participants.assignRotationPositions(tandaId, positions);
    this.tandas.updateRound(tandaId, 1, count);
    this.tandas.updateStatus(tandaId, 'active');
    return this.tandas.findById(tandaId) as TandaResponse;
  }

  /**
   * Cancels a forming or active tanda (organizer only).
   * @param tandaId - Tanda UUID.
   * @param requesterId - UUID of the requesting user.
   * @returns Updated tanda response.
   */
  cancel(tandaId: string, requesterId: string): TandaResponse {
    const tanda = this.tandas.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.organizerId !== requesterId) throw new ForbiddenError('Only the organizer can cancel the tanda');
    if (tanda.status === 'completed' || tanda.status === 'cancelled') {
      throw new BusinessRuleError(`Tanda cannot be cancelled — current status: ${tanda.status}`);
    }
    this.tandas.updateStatus(tandaId, 'cancelled');
    return this.tandas.findById(tandaId) as TandaResponse;
  }

  /**
   * Advances an active tanda to the next round (organizer only). Auto-completes on last round.
   * @param tandaId - Tanda UUID.
   * @param requesterId - UUID of the requesting user.
   * @returns Updated tanda response.
   */
  advance(tandaId: string, requesterId: string): TandaResponse {
    const tanda = this.tandas.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.organizerId !== requesterId) throw new ForbiddenError('Only the organizer can advance the round');
    if (tanda.status !== 'active') throw new BusinessRuleError('Tanda must be active to advance');

    if (tanda.currentRound >= tanda.totalRounds) {
      this.tandas.updateStatus(tandaId, 'completed');
    } else {
      this.tandas.updateRound(tandaId, tanda.currentRound + 1, tanda.totalRounds);
    }
    return this.tandas.findById(tandaId) as TandaResponse;
  }

  /**
   * Lists participants in a tanda.
   * @param tandaId - Tanda UUID.
   * @returns Array of participant responses.
   */
  listParticipants(tandaId: string): ReadonlyArray<ParticipantResponse> {
    if (!this.tandas.findById(tandaId)) throw new NotFoundError('Tanda', tandaId);
    return this.participants.findByTandaId(tandaId);
  }
}
