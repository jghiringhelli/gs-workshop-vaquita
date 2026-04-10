import { Tanda, Participant } from '../types';

/**
 * Repository interface for Tanda persistence
 */
export interface ITandaRepository {
  /**
   * Create a new tanda
   */
  create(
    name: string,
    organizerId: string,
    contributionAmount: number,
    totalRounds: number
  ): Tanda;

  /**
   * Get tanda by ID
   */
  getById(id: string): Tanda | null;

  /**
   * List tandas for a specific user (as organizer or member)
   */
  listForUser(userId: string): Tanda[];

  /**
   * Update tanda status and current round
   */
  updateStatus(
    id: string,
    status: string,
    currentRound?: number
  ): void;

  /**
   * Add participant to tanda (called during join or create)
   */
  addParticipant(
    userId: string,
    tandaId: string,
    role: 'organizer' | 'member'
  ): Participant;

  /**
   * Get all participants in a tanda
   */
  getParticipants(tandaId: string): Participant[];

  /**
   * Get participant by user and tanda
   */
  getParticipant(userId: string, tandaId: string): Participant | null;

  /**
   * Randomize and assign rotation positions for active tanda
   */
  randomizeRotation(tandaId: string): void;

  /**
   * Count participants in tanda
   */
  countParticipants(tandaId: string): number;
}
