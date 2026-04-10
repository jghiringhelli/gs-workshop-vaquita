/**
 * Tanda Service
 * Contains business logic for tanda management
 * Enforces all business rules
 */

import { Repositories } from '../types/index.js';
import { config } from '../config/index.js';
import {
  BusinessRuleError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../errors/index.js';

interface CreateTandaInput {
  name: string;
  organizerId: string;
  contributionAmount: number;
}

interface JoinTandaInput {
  userId: string;
  tandaId: string;
}

export class TandaService {
  constructor(private repositories: Repositories) {}

  /**
   * Create a new tanda
   * - Creator automatically becomes organizer and first participant
   * - Business rule: organizer must exist
   */
  createTanda(input: CreateTandaInput) {
    // Verify organizer exists
    const organizer = this.repositories.users.findById(input.organizerId);
    if (!organizer) {
      throw new NotFoundError('User', input.organizerId);
    }

    // Validate contribution amount
    if (input.contributionAmount <= 0) {
      throw new ValidationError('Contribution amount must be positive');
    }

    // Create tanda
    const tanda = this.repositories.tandas.create({
      name: input.name,
      organizerId: input.organizerId,
      contributionAmount: input.contributionAmount,
      status: 'forming',
      currentRound: 0,
      totalRounds: 1, // Will be updated when tanda starts
    });

    // Auto-join organizer as first participant
    this.repositories.participants.create({
      userId: input.organizerId,
      tandaId: tanda.id,
      role: 'organizer',
      rotationPosition: 1,
    });

    return tanda;
  }

  /**
   * Join an existing tanda
   * - Tanda must be in 'forming' status
   * - User cannot join if already a participant
   * - Cannot exceed max participants
   * - Business rule: Minimum 3, Maximum 20 participants
   */
  joinTanda(input: JoinTandaInput) {
    const tanda = this.repositories.tandas.findById(input.tandaId);
    if (!tanda) {
      throw new NotFoundError('Tanda', input.tandaId);
    }

    const user = this.repositories.users.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User', input.userId);
    }

    // Check tanda status
    if (tanda.status !== 'forming') {
      throw new BusinessRuleError(
        `Cannot join tanda in ${tanda.status} status. Only tandas in 'forming' status can accept new members.`,
      );
    }

    // Check if user is already a participant
    const existing = this.repositories.participants.findByUserAndTanda(input.userId, input.tandaId);
    if (existing) {
      throw new ConflictError('User is already a participant in this tanda');
    }

    // Check max participants limit
    const participantCount = this.repositories.participants.countByTandaId(input.tandaId);
    if (participantCount >= config.tanda.maxParticipants) {
      throw new BusinessRuleError(
        `Tanda has reached maximum participants limit (${config.tanda.maxParticipants})`,
      );
    }

    // Add participant
    const participant = this.repositories.participants.create({
      userId: input.userId,
      tandaId: input.tandaId,
      role: 'member',
      rotationPosition: participantCount + 1,
    });

    return participant;
  }

  /**
   * Start a tanda (transition from FORMING to ACTIVE)
   * - Organizer only
   * - Must have at least 3 participants
   * - Randomize rotation order
   * - Business rule: Minimum 3 participants required
   */
  startTanda(tandaId: string, requestingUserId: string) {
    const tanda = this.repositories.tandas.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError('Tanda', tandaId);
    }

    // Check authorization
    if (tanda.organizerId !== requestingUserId) {
      throw new ForbiddenError('Only the organizer can start a tanda');
    }

    // Check status
    if (tanda.status !== 'forming') {
      throw new BusinessRuleError(`Tanda is already in ${tanda.status} status`);
    }

    // Check minimum participants
    const participants = this.repositories.participants.findByTandaId(tandaId);
    if (participants.length < config.tanda.minParticipants) {
      throw new BusinessRuleError(
        `Tanda needs at least ${config.tanda.minParticipants} participants to start. Current: ${participants.length}`,
      );
    }

    // Randomize rotation order
    const shuffled = this.shuffleArray([...participants]);
    shuffled.forEach((participant, index) => {
      this.repositories.participants.update(participant.id, {
        rotationPosition: index + 1,
      });
    });

    // Update tanda
    const updatedTanda = this.repositories.tandas.update(tandaId, {
      status: 'active',
      currentRound: 1,
      totalRounds: participants.length,
    });

    // Initialize contributions for round 1
    shuffled.forEach((participant) => {
      this.repositories.contributions.create({
        tandaId,
        participantId: participant.id,
        round: 1,
        amount: tanda.contributionAmount,
        status: 'pending',
        paidAt: null,
      });
    });

    return updatedTanda;
  }

  /**
   * Cancel a tanda
   * - Organizer only
   */
  cancelTanda(tandaId: string, requestingUserId: string) {
    const tanda = this.repositories.tandas.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError('Tanda', tandaId);
    }

    if (tanda.organizerId !== requestingUserId) {
      throw new ForbiddenError('Only the organizer can cancel a tanda');
    }

    if (tanda.status === 'cancelled' || tanda.status === 'completed') {
      throw new BusinessRuleError(`Cannot cancel a tanda in ${tanda.status} status`);
    }

    const updatedTanda = this.repositories.tandas.update(tandaId, { status: 'cancelled' });
    return updatedTanda;
  }

  /**
   * Get tanda details
   */
  getTanda(tandaId: string) {
    const tanda = this.repositories.tandas.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError('Tanda', tandaId);
    }

    return tanda;
  }

  /**
   * List tandas for a user
   */
  listTandasForUser(userId: string) {
    const user = this.repositories.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Find all tandas where user is a participant
    const allTandas = this.repositories.tandas.list();
    const userTandas = allTandas.filter((tanda) => {
      const participant = this.repositories.participants.findByUserAndTanda(userId, tanda.id);
      return !!participant;
    });

    return userTandas;
  }

  /**
   * List all tandas
   */
  listAllTandas() {
    return this.repositories.tandas.list();
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
