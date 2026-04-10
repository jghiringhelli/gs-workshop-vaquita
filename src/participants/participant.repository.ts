import type { Participant } from "./participant.types.js";

/**
 * Persistence contract for participant data.
 */
export interface IParticipantRepository {
  /** Persists a new participant and returns it. */
  create(participant: Participant): Participant;

  /** Returns all participants for a given tanda, ordered by rotation_position. */
  findByTandaId(tandaId: string): Participant[];

  /** Returns a participant by their user+tanda combo, or null. */
  findByUserAndTanda(userId: string, tandaId: string): Participant | null;

  /** Returns a participant by their own ID. */
  findById(id: string): Participant | null;

  /**
   * Assigns rotation positions to all participants in bulk.
   * @param tandaId - The tanda being started.
   * @param positions - Map from participantId → rotationPosition.
   */
  assignRotationPositions(tandaId: string, positions: Map<string, number>): void;

  /**
   * Updates the consecutive miss count for a single participant.
   * @param participantId - Target participant.
   * @param count - New consecutive miss count.
   */
  updateConsecutiveMisses(participantId: string, count: number): void;
}
