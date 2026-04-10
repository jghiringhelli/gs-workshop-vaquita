import type { Contribution } from "./contribution.types.js";

/**
 * Persistence contract for contribution data.
 */
export interface IContributionRepository {
  /** Persists a new contribution and returns it. */
  create(contribution: Contribution): Contribution;

  /** Returns all contributions for a given tanda and round. */
  findByTandaAndRound(tandaId: string, round: number): Contribution[];

  /** Returns all contributions for a given participant. */
  findByParticipantId(participantId: string): Contribution[];

  /** Returns a contribution for a specific participant in a specific round, or null. */
  findByParticipantAndRound(participantId: string, round: number): Contribution | null;

  /**
   * Records missed contributions for all participants who have not paid in the given round.
   * @param tandaId - The tanda being finalized.
   * @param round - The round being closed.
   * @param participantIds - All participant IDs in the tanda.
   */
  createMissedForRound(tandaId: string, round: number, participantIds: string[]): void;
}
