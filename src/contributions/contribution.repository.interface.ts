import { Contribution, CreateContributionDTO } from './contribution.types';

/**
 * Port (interface) for contribution persistence.
 * The service depends on this abstraction — not the concrete SQLite class.
 */
export interface IContributionRepository {
  /**
   * Inserts a new contribution record.
   * @param dto - Validated creation data
   * @returns The created Contribution domain entity
   */
  create(dto: CreateContributionDTO): Contribution;

  /**
   * Looks up an existing contribution for a participant in a specific round.
   * Used to enforce the one-contribution-per-participant-per-round rule.
   * @param participantId - Participant UUID
   * @param round - Round number
   * @returns The Contribution if found, null otherwise
   */
  findByParticipantAndRound(participantId: string, round: number): Contribution | null;

  /**
   * Returns all contributions recorded for a given tanda in a specific round.
   * Used to build the round summary (paid list + totalCollected).
   * @param tandaId - Tanda UUID
   * @param round - Round number
   * @returns Array of Contribution entities (may be empty)
   */
  findByTandaAndRound(tandaId: string, round: number): Contribution[];

  /**
   * Returns all contributions for a participant, ordered by round ascending.
   * Used for the contribution history endpoint.
   * @param participantId - Participant UUID
   * @returns Array of Contribution entities (may be empty)
   */
  findByParticipantId(participantId: string): Contribution[];
}
