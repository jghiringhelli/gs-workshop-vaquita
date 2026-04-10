import { Participant, CreateParticipantDTO } from './participant.types';

/**
 * Port interface for participant persistence.
 * Extended in later slices as more query patterns are needed.
 */
export interface IParticipantRepository {
  /**
   * Persists a new participant record and returns the domain entity.
   * @param dto - Creation data including userId, tandaId, and role
   */
  create(dto: CreateParticipantDTO): Participant;
}
