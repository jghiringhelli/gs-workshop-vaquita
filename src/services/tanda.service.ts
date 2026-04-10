import { z } from 'zod';
import { Tanda, Participant } from '../types';
import { ITandaRepository } from '../repositories/tanda-repository.interface';
import { IUserRepository } from '../repositories/user-repository.interface';
import { config } from '../config';

/**
 * Custom errors for tanda domain
 */
export class TandaNotFoundError extends Error {
  constructor(id: string) {
    super(`Tanda with ID ${id} not found`);
    this.name = 'TandaNotFoundError';
  }
}

export class InvalidTandaStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTandaStatusError';
  }
}

export class InsufficientParticipantsError extends Error {
  constructor(current: number, required: number) {
    super(`Need at least ${required} participants (have ${current})`);
    this.name = 'InsufficientParticipantsError';
  }
}

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User with ID ${id} not found`);
    this.name = 'UserNotFoundError';
  }
}

export class AlreadyParticipantError extends Error {
  constructor(userId: string, tandaId: string) {
    super(`User ${userId} is already a participant in tanda ${tandaId}`);
    this.name = 'AlreadyParticipantError';
  }
}

/**
 * Input validation schemas
 */
export const createTandaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  organizerId: z.string().uuid('Invalid organizer ID'),
  contributionAmount: z.number().positive('Amount must be positive'),
  totalRounds: z.number().int().min(1, 'Must have at least 1 round'),
});

export const joinTandaSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type CreateTandaInput = z.infer<typeof createTandaSchema>;
export type JoinTandaInput = z.infer<typeof joinTandaSchema>;

/**
 * Tanda service - orchestrates business logic
 */
export class TandaService {
  constructor(
    private tandaRepository: ITandaRepository,
    private userRepository: IUserRepository
  ) {}

  /**
   * Create a new tanda
   * Organizer is auto-added as first participant
   */
  createTanda(
    name: string,
    organizerId: string,
    contributionAmount: number,
    totalRounds: number
  ): Tanda {
    // Validate organizer exists
    if (!this.userRepository.getById(organizerId)) {
      throw new UserNotFoundError(organizerId);
    }

    return this.tandaRepository.create(
      name,
      organizerId,
      contributionAmount,
      totalRounds
    );
  }

  /**
   * Get tanda by ID
   */
  getTandaById(id: string): Tanda {
    const tanda = this.tandaRepository.getById(id);
    if (!tanda) {
      throw new TandaNotFoundError(id);
    }
    return tanda;
  }

  /**
   * List tandas for a user
   */
  listTandasForUser(userId: string): Tanda[] {
    return this.tandaRepository.listForUser(userId);
  }

  /**
   * Join a tanda as a member
   * @throws InsufficientParticipantsError if at max capacity
   * @throws AlreadyParticipantError if user already in tanda
   * @throws InvalidTandaStatusError if tanda not in forming
   */
  joinTanda(tandaId: string, userId: string): Participant {
    const tanda = this.getTandaById(tandaId);

    // User must exist
    if (!this.userRepository.getById(userId)) {
      throw new UserNotFoundError(userId);
    }

    // Must be in forming status
    if (tanda.status !== 'forming') {
      throw new InvalidTandaStatusError('Cannot join: tanda not in forming status');
    }

    // Check if already participant
    if (this.tandaRepository.getParticipant(userId, tandaId)) {
      throw new AlreadyParticipantError(userId, tandaId);
    }

    // Check max capacity
    const count = this.tandaRepository.countParticipants(tandaId);
    if (count >= config.maxParticipants) {
      throw new Error(`Tanda is at maximum capacity (${config.maxParticipants} participants)`);
    }

    return this.tandaRepository.addParticipant(userId, tandaId, 'member');
  }

  /**
   * Start a tanda (FORMING → ACTIVE)
   * Requires at least minParticipants, randomizes rotation
   * @throws InvalidTandaStatusError if not in forming or wrong organizer
   * @throws InsufficientParticipantsError if < minParticipants
   */
  startTanda(tandaId: string, organizerId: string): Tanda {
    const tanda = this.getTandaById(tandaId);

    // Only organizer can start
    if (tanda.organizerId !== organizerId) {
      throw new InvalidTandaStatusError('Only organizer can start a tanda');
    }

    // Must be in forming status
    if (tanda.status !== 'forming') {
      throw new InvalidTandaStatusError('Tanda already started or completed');
    }

    // Must have minimum participants
    const count = this.tandaRepository.countParticipants(tandaId);
    if (count < config.minParticipants) {
      throw new InsufficientParticipantsError(count, config.minParticipants);
    }

    // Randomize rotation
    this.tandaRepository.randomizeRotation(tandaId);

    // Update status to active
    this.tandaRepository.updateStatus(tandaId, 'active');

    return this.getTandaById(tandaId);
  }

  /**
   * Get participants in a tanda
   */
  getParticipants(tandaId: string): Participant[] {
    this.getTandaById(tandaId); // Verify tanda exists
    return this.tandaRepository.getParticipants(tandaId);
  }

  /**
   * Cancel a tanda (organizer only)
   */
  cancelTanda(tandaId: string, organizerId: string): Tanda {
    const tanda = this.getTandaById(tandaId);

    if (tanda.organizerId !== organizerId) {
      throw new InvalidTandaStatusError('Only organizer can cancel a tanda');
    }

    if (tanda.status === 'completed') {
      throw new InvalidTandaStatusError('Cannot cancel a completed tanda');
    }

    this.tandaRepository.updateStatus(tandaId, 'cancelled');
    return this.getTandaById(tandaId);
  }
}
