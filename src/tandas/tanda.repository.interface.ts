import { Tanda, TandaStatus, CreateTandaDTO } from './tanda.types';

/**
 * Data required to atomically start a tanda.
 * Passed as a unit to keep the transaction boundary in one method call.
 */
export interface StartTandaData {
  /** Number of rounds, equal to the participant count at start time. */
  totalRounds: number;
  /** Rotation position assigned to each participant, randomised by the service layer. */
  assignments: ReadonlyArray<{ participantId: string; rotationPosition: number }>;
}

/**
 * Port interface for tanda persistence.
 * Defined in the domain layer; implemented by the SQLite adapter.
 */
export interface ITandaRepository {
  /**
   * Persists a new tanda and returns the created domain entity.
   * @param dto - Validated creation data
   */
  create(dto: CreateTandaDTO): Tanda;

  /**
   * Retrieves a tanda by primary key.
   * @param id - Tanda UUID
   * @returns The Tanda, or null if not found
   */
  findById(id: string): Tanda | null;

  /**
   * Returns all tandas in which the given user is a participant (any role).
   * Implemented as a JOIN on the participants table.
   * @param userId - User UUID to filter by
   */
  findByUserId(userId: string): Tanda[];

  /**
   * Atomically transitions a tanda from FORMING to ACTIVE, assigns rotation
   * positions to all participants, and sets totalRounds — all in one transaction.
   * If any step fails the entire operation rolls back.
   *
   * @param tandaId - Tanda UUID
   * @param data - Total rounds count and per-participant rotation assignments
   * @returns The updated Tanda entity
   */
  startTanda(tandaId: string, data: StartTandaData): Tanda;

  /**
   * Transitions a tanda to CANCELLED status.
   * @param tandaId - Tanda UUID
   * @returns The updated Tanda entity
   */
  cancelTanda(tandaId: string): Tanda;

  /**
   * Atomically increments currentRound and, if the new round exceeds totalRounds,
   * transitions the tanda to COMPLETED — all in a single UPDATE statement.
   *
   * A single SQL UPDATE is inherently atomic in SQLite. Doing both writes in one
   * statement avoids any window where round is incremented but status is still active.
   *
   * @param tandaId   - Tanda UUID
   * @param newRound  - The incremented round number (computed by the service)
   * @param newStatus - 'active' or 'completed', determined by the service
   * @returns The updated Tanda entity
   */
  advanceTanda(tandaId: string, newRound: number, newStatus: TandaStatus): Tanda;
}
