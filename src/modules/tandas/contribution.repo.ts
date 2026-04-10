import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db';

/** Contribution status values. */
export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

/** Represents a contribution record as returned from the database. */
export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
}

/** Fields required to create a contribution row. */
export interface CreateContributionData {
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
}

/**
 * Inserts a new contribution record and returns it.
 *
 * @param data - Contribution creation data.
 * @returns The newly created contribution.
 */
export function createContribution(data: CreateContributionData): Contribution {
  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO contributions (id, tandaId, participantId, round, amount, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.tandaId, data.participantId, data.round, data.amount, data.status);
  return { id, ...data };
}

/**
 * Finds a contribution by participant and round (the unique contribution record).
 *
 * @param participantId - The participant's UUID.
 * @param round - The round number.
 * @returns The contribution record, or undefined if not found.
 */
export function findByParticipantAndRound(
  participantId: string,
  round: number,
): Contribution | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM contributions WHERE participantId = ? AND round = ?
  `).get(participantId, round) as Contribution | undefined;
}

/**
 * Returns all contributions for a specific tanda round.
 *
 * @param tandaId - The tanda's UUID.
 * @param round - The round number.
 * @returns Array of contribution records.
 */
export function findByTandaAndRound(tandaId: string, round: number): Contribution[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM contributions WHERE tandaId = ? AND round = ?
  `).all(tandaId, round) as Contribution[];
}

/**
 * Returns all contributions for a specific participant, ordered by round.
 *
 * @param participantId - The participant's UUID.
 * @returns Array of contribution records in ascending round order.
 */
export function findByParticipant(participantId: string): Contribution[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM contributions WHERE participantId = ? ORDER BY round
  `).all(participantId) as Contribution[];
}

/**
 * Returns all contributions for a tanda, ordered by round then participantId.
 *
 * @param tandaId - The tanda's UUID.
 * @returns Array of contribution records.
 */
export function findByTanda(tandaId: string): Contribution[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM contributions WHERE tandaId = ? ORDER BY round, participantId
  `).all(tandaId) as Contribution[];
}
