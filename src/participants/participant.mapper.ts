import { Participant, ParticipantResponseDTO } from './participant.types';

/**
 * Maps a domain Participant entity to the API response DTO.
 *
 * Explicit field enumeration ensures internal fields added to Participant
 * do not automatically appear in API responses.
 *
 * @param participant - Internal domain entity
 * @returns Public response DTO safe to serialize to JSON
 */
export function toParticipantResponseDTO(participant: Participant): ParticipantResponseDTO {
  return {
    id: participant.id,
    userId: participant.userId,
    tandaId: participant.tandaId,
    role: participant.role,
    rotationPosition: participant.rotationPosition,
    createdAt: participant.createdAt,
  };
}
