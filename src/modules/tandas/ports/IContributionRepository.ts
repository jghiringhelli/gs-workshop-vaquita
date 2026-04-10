import { Contribution } from '../domain/Tanda';

/** Port interface — all contribution persistence must go through this. */
export interface IContributionRepository {
  /**
   * Records a new contribution.
   * @param data - Contribution data without id.
   * @returns The created contribution.
   */
  create(data: Omit<Contribution, 'id'>): Contribution;

  /**
   * Finds a contribution for a participant in a given round.
   * @param participantId - Participant UUID.
   * @param round - Round number.
   * @returns Contribution or undefined.
   */
  findByParticipantAndRound(participantId: string, round: number): Contribution | undefined;

  /**
   * Returns all contributions for a tanda round.
   * @param tandaId - Tanda UUID.
   * @param round - Round number.
   * @returns Array of contributions.
   */
  findByTandaAndRound(tandaId: string, round: number): Contribution[];

  /**
   * Returns all contributions for a participant across all rounds.
   * @param participantId - Participant UUID.
   * @returns Array of contributions ordered by round.
   */
  findByParticipant(participantId: string): Contribution[];
}
