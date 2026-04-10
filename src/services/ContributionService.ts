/**
 * Contribution Service
 * Contains business logic for contribution management and round advancement
 */

import { Repositories } from '../types/index.js';
import { config } from '../config/index.js';
import {
  BusinessRuleError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../errors/index.js';

interface RecordContributionInput {
  participantId: string;
  amount: number;
}

interface RoundSummary {
  round: number;
  tandaId: string;
  contributorCount: number;
  totalAmount: number;
  expectedAmount: number;
  contributions: Array<{
    participantId: string;
    status: string;
    amount: number;
    paidAt: Date | null;
  }>;
}

export class ContributionService {
  constructor(private repositories: Repositories) {}

  /**
   * Record a contribution
   * - Participant must exist
   * - Tanda must be active
   * - Contribution for current round must be pending
   * - If late, apply penalty
   */
  recordContribution(tandaId: string, input: RecordContributionInput) {
    const tanda = this.repositories.tandas.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError('Tanda', tandaId);
    }

    const participant = this.repositories.participants.findById(input.participantId);
    if (!participant) {
      throw new NotFoundError('Participant', input.participantId);
    }

    // Check tanda is active
    if (tanda.status !== 'active') {
      throw new BusinessRuleError(
        `Cannot record contribution. Tanda is in ${tanda.status} status.`,
      );
    }

    // Check participant belongs to tanda
    if (participant.tandaId !== tandaId) {
      throw new BusinessRuleError('Participant does not belong to this tanda');
    }

    // Find existing contribution for current round
    const existingContributions = this.repositories.contributions.findByTandaAndRound(
      tandaId,
      tanda.currentRound,
    );
    const existing = existingContributions.find(
      (c) => c.participantId === input.participantId,
    );

    if (!existing) {
      throw new NotFoundError(
        `Contribution for participant ${input.participantId} in round ${tanda.currentRound}`,
      );
    }

    if (existing.status !== 'pending') {
      throw new ConflictError(
        `Contribution already recorded with status: ${existing.status}`,
      );
    }

    // Determine if late (simple rule: any contribution after first round is considered potentially late)
    // In a real system, you'd have a deadline for each round
    let finalAmount = input.amount;
    let status: 'paid' | 'late' = 'paid';

    // Calculate penalty if applicable (configurable via environment)
    if (tanda.currentRound > 1) {
      const penalty = Math.floor(input.amount * config.tanda.latePenaltyPercent);
      finalAmount = input.amount + penalty;
      status = 'late';
    }

    // Record the contribution
    const contribution = this.repositories.contributions.update(existing.id, {
      amount: finalAmount,
      status,
      paidAt: new Date(),
    });

    return contribution;
  }

  /**
   * Get round summary
   */
  getRoundSummary(tandaId: string, round: number): RoundSummary {
    const tanda = this.repositories.tandas.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError('Tanda', tandaId);
    }

    const contributions = this.repositories.contributions.findByTandaAndRound(tandaId, round);
    const participants = this.repositories.participants.findByTandaId(tandaId);

    const expectedAmount = tanda.contributionAmount * participants.length;
    const totalAmount = contributions
      .filter((c) => c.status !== 'pending' && c.status !== 'missed')
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      round,
      tandaId,
      contributorCount: contributions.filter((c) => c.status !== 'pending' && c.status !== 'missed').length,
      totalAmount,
      expectedAmount,
      contributions: contributions.map((c) => ({
        participantId: c.participantId,
        status: c.status,
        amount: c.amount,
        paidAt: c.paidAt,
      })),
    };
  }

  /**
   * Get participant contribution history
   */
  getParticipantHistory(tandaId: string, participantId: string) {
    const tanda = this.repositories.tandas.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError('Tanda', tandaId);
    }

    const participant = this.repositories.participants.findById(participantId);
    if (!participant) {
      throw new NotFoundError('Participant', participantId);
    }

    if (participant.tandaId !== tandaId) {
      throw new BusinessRuleError('Participant does not belong to this tanda');
    }

    return this.repositories.contributions.findByParticipantAndTanda(participantId, tandaId);
  }

  /**
   * Advance to next round
   * - Organizer only
   * - Current round must have all required contributions (or marked as missed/late paid)
   * - After last round, auto-complete tanda
   * - Business 'rule: only organizer can advance rounds, auto-complete after last round
   */
  advanceRound(tandaId: string, requestingUserId: string) {
    const tanda = this.repositories.tandas.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError('Tanda', tandaId);
    }

    // Check authorization
    if (tanda.organizerId !== requestingUserId) {
      throw new ForbiddenError('Only the organizer can advance to the next round');
    }

    // Check status
    if (tanda.status !== 'active') {
      throw new BusinessRuleError(
        `Cannot advance round. Tanda is in ${tanda.status} status.`,
      );
    }

    const participants = this.repositories.participants.findByTandaId(tandaId);
    const currentContributions = this.repositories.contributions.findByTandaAndRound(
      tandaId,
      tanda.currentRound,
    );

    // Check all contributions are accounted for (paid, late, or missed)
    const unhandledCount = currentContributions.filter(
      (c) => c.status === 'pending',
    ).length;
    if (unhandledCount > 0) {
      throw new BusinessRuleError(
        `Cannot advance round. ${unhandledCount} contribution(s) still pending.`,
      );
    }

    // Check if this is the last round
    if (tanda.currentRound >= tanda.totalRounds) {
      const updatedTanda = this.repositories.tandas.update(tandaId, {
        status: 'completed',
      });
      return { tanda: updatedTanda, message: 'Tanda completed' };
    }

    // Move to next round
    const nextRound = tanda.currentRound + 1;

    // Create contributions for next round
    participants.forEach((participant) => {
      this.repositories.contributions.create({
        tandaId,
        participantId: participant.id,
        round: nextRound,
        amount: tanda.contributionAmount,
        status: 'pending',
        paidAt: null,
      });
    });

    const updatedTanda = this.repositories.tandas.update(tandaId, {
      currentRound: nextRound,
    });

    return { tanda: updatedTanda, message: `Advanced to round ${nextRound}` };
  }
}
