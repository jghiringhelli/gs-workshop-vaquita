import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import type { Contribution, ContributionStatus } from '../types';

/**
 * Inserts a contribution row.
 * @param tandaId - Tanda UUID
 * @param participantId - Participant UUID
 * @param round - Round number
 * @param amount - Contributed amount
 * @param status - paid | late | missed
 * @returns Created Contribution
 */
export function createContribution(
  tandaId: string,
  participantId: string,
  round: number,
  amount: number,
  status: ContributionStatus,
): Contribution {
  const id = uuidv4();
  getDb()
    .prepare(
      `INSERT INTO contributions (id, tandaId, participantId, round, amount, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, tandaId, participantId, round, amount, status);
  return { id, tandaId, participantId, round, amount, status };
}

/**
 * Returns all contributions for a tanda in a given round.
 * @param tandaId - Tanda UUID
 * @param round - Round number
 * @returns Array of Contribution
 */
export function findContributionsByRound(tandaId: string, round: number): Contribution[] {
  return getDb()
    .prepare('SELECT * FROM contributions WHERE tandaId = ? AND round = ?')
    .all(tandaId, round) as Contribution[];
}

/**
 * Finds the contribution for a specific participant in a specific round.
 * @param participantId - Participant UUID
 * @param round - Round number
 * @returns Contribution or undefined
 */
export function findContributionByParticipantAndRound(
  participantId: string,
  round: number,
): Contribution | undefined {
  return getDb()
    .prepare('SELECT * FROM contributions WHERE participantId = ? AND round = ?')
    .get(participantId, round) as Contribution | undefined;
}

/**
 * Returns all contributions for a participant ordered by round.
 * @param participantId - Participant UUID
 * @returns Array of Contribution
 */
export function findContributionsByParticipant(participantId: string): Contribution[] {
  return getDb()
    .prepare('SELECT * FROM contributions WHERE participantId = ? ORDER BY round')
    .all(participantId) as Contribution[];
}
