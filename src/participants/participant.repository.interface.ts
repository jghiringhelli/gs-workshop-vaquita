import { Participant, CreateParticipantDTO } from './participant.types';

/**
 * Port interface for participant persistence.
 */
export interface IParticipantRepository {
  /**
   * Persists a new participant record and returns the domain entity.
   * @param dto - Creation data including userId, tandaId, and role
   */
  create(dto: CreateParticipantDTO): Participant;

  /**
   * Returns all participants belonging to a given tanda, ordered by creation date.
   * Used for both listing participants and counting them (for max-participant enforcement).
   * @param tandaId - Tanda UUID
   */
  findByTandaId(tandaId: string): Participant[];

  /**
   * Looks up a single participant by tanda + user combination.
   * Used to detect duplicate joins before attempting an insert.
   * @param tandaId - Tanda UUID
   * @param userId - User UUID
   * @returns The Participant if found, or null
   */
  findByTandaAndUser(tandaId: string, userId: string): Participant | null;
}
