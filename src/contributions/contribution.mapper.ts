import { Contribution, ContributionResponseDTO } from './contribution.types';

/**
 * Maps a Contribution domain entity to a ContributionResponseDTO.
 * Acts as the firewall between the internal domain model and the API response shape.
 *
 * @param contribution - Domain entity
 * @returns Safe response DTO with only API-public fields
 */
export function toContributionResponseDTO(contribution: Contribution): ContributionResponseDTO {
  return {
    id: contribution.id,
    tandaId: contribution.tandaId,
    participantId: contribution.participantId,
    round: contribution.round,
    amount: contribution.amount,
    status: contribution.status,
    createdAt: contribution.createdAt,
  };
}
