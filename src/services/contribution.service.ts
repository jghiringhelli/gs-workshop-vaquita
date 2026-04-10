import { z } from 'zod';
import { Contribution, Round } from '../types';
import { IContributionRepository } from '../repositories/contribution-repository.interface';
import { ITandaRepository } from '../repositories/tanda-repository.interface';
import { IUserRepository } from '../repositories/user-repository.interface';
import { config } from '../config';

/**
 * Custom errors for contribution domain
 */
export class ContributionNotFoundError extends Error {
  constructor(id: string) {
    super(`Contribution with ID ${id} not found`);
    this.name = 'ContributionNotFoundError';
  }
}

export class InvalidContributionAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidContributionAmountError';
  }
}

export class RoundNotFoundError extends Error {
  constructor(tandaId: string, round: number) {
    super(`Round ${round} for tanda ${tandaId} not found`);
    this.name = 'RoundNotFoundError';
  }
}

export class ParticipantNotFoundInTandaError extends Error {
  constructor(participantId: string) {
    super(`Participant ${participantId} not found in tanda`);
    this.name = 'ParticipantNotFoundInTandaError';
  }
}

/**
 * Input validation schemas
 */
export const recordContributionSchema = z.object({
  participantId: z.string().uuid('Invalid participant ID'),
  amount: z.number().positive('Amount must be positive'),
});

export type RecordContributionInput = z.infer<typeof recordContributionSchema>;

/**
 * Contribution service - manages contributions and rounds
 */
export class ContributionService {
  constructor(
    private contributionRepository: IContributionRepository,
    private tandaRepository: ITandaRepository,
    private userRepository: IUserRepository
  ) {}

  /**
   * Record a contribution for current round
   * Calculates late fees if needed
   */
  recordContribution(
    tandaId: string,
    participantId: string,
    amount: number
  ): Contribution {
    // Verify tanda exists (import TandaNotFoundError from tanda service or throw generic here)
    const tanda = this.tandaRepository.getById(tandaId);
    if (!tanda) {
      throw new Error(`Tanda ${tandaId} not found`);
    }

    // Verify participant exists in this tanda
    const participant = this.tandaRepository.getParticipants(tandaId).find((p) => p.id === participantId);
    if (!participant) {
      throw new ParticipantNotFoundInTandaError(participantId);
    }

    // Amount must match tanda contribution amount or contribution + late fee
    const lateFeeAmount = tanda.contributionAmount * (1 + config.lateFeePct / 100);
    if (amount !== tanda.contributionAmount && amount !== lateFeeAmount) {
      throw new InvalidContributionAmountError(
        `Amount must be exact (${tanda.contributionAmount}) or with late fee (${lateFeeAmount})`
      );
    }

    // Determine if this is a late payment
    const isLate = amount > tanda.contributionAmount;
    const status = isLate ? 'late' : 'paid';

    return this.contributionRepository.recordContribution(
      tandaId,
      participantId,
      tanda.currentRound,
      amount,
      status
    );
  }

  /**
   * Get round summary with all contributions and totals
   */
  getRoundSummary(tandaId: string, round: number): {
    round: Round;
    contributions: Contribution[];
    totalCollected: number;
    totalRequired: number;
    recipient: { id: string; name: string } | null;
  } {
    const tanda = this.tandaRepository.getById(tandaId);
    if (!tanda) {
      throw new Error(`Tanda ${tandaId} not found`);
    }

    const roundData = this.contributionRepository.getRound(tandaId, round);
    if (!roundData) {
      throw new RoundNotFoundError(tandaId, round);
    }

    const contributions = this.contributionRepository.getByRound(tandaId, round);
    const participants = this.tandaRepository.getParticipants(tandaId);
    const totalRequired = tanda.contributionAmount * participants.length;

    let recipient = null;
    if (roundData.recipientUserId) {
      const user = this.userRepository.getById(roundData.recipientUserId);
      if (user) {
        recipient = { id: user.id, name: user.name };
      }
    }

    return {
      round: roundData,
      contributions,
      totalCollected: roundData.totalCollected,
      totalRequired,
      recipient,
    };
  }

  /**
   * Get participant contribution history
   */
  getParticipantHistory(participantId: string): Contribution[] {
    return this.contributionRepository.getParticipantHistory(participantId);
  }

  /**
   * Advance to next round (organizer only)
   * Validates all contributions are in, assigns recipient, marks round complete
   */
  advanceRound(tandaId: string, organizerId: string): {
    completedRound: Round;
    newRound: Round;
  } {
    const tanda = this.tandaRepository.getById(tandaId);
    if (!tanda) {
      throw new Error(`Tanda ${tandaId} not found`);
    }

    if (tanda.organizerId !== organizerId) {
      throw new Error('Only organizer can advance rounds');
    }

    if (tanda.status !== 'active') {
      throw new Error('Tanda is not active');
    }

    // Get contributions for current round
    const contributions = this.contributionRepository.getByRound(tandaId, tanda.currentRound);
    const participants = this.tandaRepository.getParticipants(tandaId);
    const totalCollected = contributions.reduce((sum, c) => sum + c.amount, 0);

    // Get recipient based on rotation position
    const recipientParticipant = participants.find((p) => p.rotationPosition === tanda.currentRound - 1);
    let recipientUserId = recipientParticipant?.userId || null;

    // Update current round
    this.contributionRepository.updateRound(
      tandaId,
      tanda.currentRound,
      recipientUserId,
      totalCollected,
      'completed'
    );

    const completedRound = this.contributionRepository.getRound(tandaId, tanda.currentRound)!;

    // Advance to next round
    const nextRound = tanda.currentRound + 1;

    if (nextRound > tanda.totalRounds) {
      // Mark tanda as completed
      this.tandaRepository.updateStatus(tandaId, 'completed');
    } else {
      // Create next round
      this.contributionRepository.getOrCreateRound(tandaId, nextRound);
      // Update tanda current round
      this.tandaRepository.updateStatus(tandaId, 'active', nextRound);
    }

    const newRound = this.contributionRepository.getRound(tandaId, nextRound) ||
      this.contributionRepository.getOrCreateRound(tandaId, nextRound);

    return {
      completedRound,
      newRound,
    };
  }
}
