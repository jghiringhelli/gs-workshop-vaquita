import { Contribution, Round } from '../types';

/**
 * Repository interface for Contribution persistence
 */
export interface IContributionRepository {
  /**
   * Record a contribution
   */
  recordContribution(
    tandaId: string,
    participantId: string,
    round: number,
    amount: number,
    status: 'paid' | 'late' | 'pending'
  ): Contribution;

  /**
   * Get contribution by ID
   */
  getById(id: string): Contribution | null;

  /**
   * Get all contributions for a round
   */
  getByRound(tandaId: string, round: number): Contribution[];

  /**
   * Get contribution history for a participant
   */
  getParticipantHistory(participantId: string): Contribution[];

  /**
   * Update contribution status
   */
  updateStatus(
    id: string,
    status: 'paid' | 'late' | 'missed'
  ): void;

  /**
   * Get or create round
   */
  getOrCreateRound(tandaId: string, round: number): Round;

  /**
   * Update round recipient and total collected
   */
  updateRound(
    tandaId: string,
    round: number,
    recipientUserId: string | null,
    totalCollected: number,
    status: 'pending' | 'completed'
  ): void;

  /**
   * Get round
   */
  getRound(tandaId: string, round: number): Round | null;

  /**
   * Get all rounds for a tanda
   */
  getRounds(tandaId: string): Round[];
}
