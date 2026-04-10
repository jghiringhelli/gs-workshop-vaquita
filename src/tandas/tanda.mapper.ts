import { Tanda, TandaResponseDTO } from './tanda.types';

/**
 * Maps a domain Tanda entity to the API response DTO.
 *
 * Explicit field enumeration ensures that internal fields added to Tanda
 * do not automatically appear in API responses.
 *
 * @param tanda - Internal domain entity
 * @returns Public response DTO safe to serialize to JSON
 */
export function toTandaResponseDTO(tanda: Tanda): TandaResponseDTO {
  return {
    id: tanda.id,
    name: tanda.name,
    organizerId: tanda.organizerId,
    contributionAmount: tanda.contributionAmount,
    status: tanda.status,
    currentRound: tanda.currentRound,
    totalRounds: tanda.totalRounds,
    createdAt: tanda.createdAt,
  };
}
