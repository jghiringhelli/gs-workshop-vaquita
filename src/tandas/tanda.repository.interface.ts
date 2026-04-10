import { Tanda, CreateTandaDTO } from './tanda.types';

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
}
