import { Tanda, Participant, Contribution } from './tanda.entity.js';

/**
 * Port interface for tanda persistence.
 */
export interface ITandaRepository {
  /**
   * Persists a new tanda.
   * @param data - Tanda fields excluding the generated id
   * @returns The created Tanda with id
   */
  create(data: Omit<Tanda, 'id'>): Tanda;

  /**
   * Finds a tanda by id.
   * @param id - UUID of the tanda
   * @returns The Tanda or null if not found
   */
  findById(id: string): Tanda | null;

  /**
   * Lists all tandas where the user is a participant.
   * @param userId - UUID of the user
   * @returns Array of Tanda records
   */
  findByUserId(userId: string): Tanda[];

  /**
   * Updates mutable tanda fields.
   * @param id - UUID of the tanda to update
   * @param updates - Partial tanda fields to apply
   * @returns The updated Tanda
   */
  update(id: string, updates: Partial<Omit<Tanda, 'id'>>): Tanda;
}

/**
 * Port interface for participant persistence.
 */
export interface IParticipantRepository {
  /**
   * Persists a new participant.
   * @param data - Participant fields excluding the generated id
   * @returns The created Participant with id
   */
  create(data: Omit<Participant, 'id'>): Participant;

  /**
   * Lists all participants for a tanda.
   * @param tandaId - UUID of the tanda
   * @returns Array of Participant records
   */
  findByTandaId(tandaId: string): Participant[];

  /**
   * Finds the participation record for a given user in a given tanda.
   * @param userId  - UUID of the user
   * @param tandaId - UUID of the tanda
   * @returns The Participant or null if not a member
   */
  findByUserAndTanda(userId: string, tandaId: string): Participant | null;

  /**
   * Bulk-assigns rotation positions to participants.
   * @param assignments - Array of { id, rotationPosition } pairs
   */
  assignPositions(assignments: Array<{ id: string; rotationPosition: number }>): void;
}

/**
 * Port interface for contribution persistence.
 */
export interface IContributionRepository {
  /**
   * Persists a new contribution.
   * @param data - Contribution fields excluding the generated id
   * @returns The created Contribution with id
   */
  create(data: Omit<Contribution, 'id'>): Contribution;

  /**
   * Lists all contributions for a tanda in a specific round.
   * @param tandaId - UUID of the tanda
   * @param round   - Round number (1-based)
   * @returns Array of Contribution records
   */
  findByTandaAndRound(tandaId: string, round: number): Contribution[];

  /**
   * Lists all contributions made by a participant.
   * @param participantId - UUID of the participant
   * @returns Array of Contribution records ordered by round
   */
  findByParticipant(participantId: string): Contribution[];

  /**
   * Finds a specific contribution by participant and round.
   * @param participantId - UUID of the participant
   * @param round         - Round number
   * @returns The Contribution or null if not found
   */
  findByParticipantAndRound(participantId: string, round: number): Contribution | null;

  /**
   * Updates the status of a contribution.
   * @param id     - UUID of the contribution
   * @param status - New status
   * @returns The updated Contribution
   */
  updateStatus(id: string, status: Contribution['status']): Contribution;
}

