import { db } from '../../infrastructure/database';
import { v4 as uuidv4 } from 'uuid';

/** Possible lifecycle states of a contribution. */
export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

/** Represents a single contribution record tied to a participant and round. */
export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  createdAt: string;
}

/** Input shape for creating a new contribution row. */
export interface CreateContributionInput {
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
}

/**
 * Inserts a new contribution row and returns it.
 *
 * @param input - Contribution creation data.
 * @returns The created Contribution.
 */
export function createContribution(
  input: CreateContributionInput,
): Contribution {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO contributions (id, tandaId, participantId, round, amount, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(
    id,
    input.tandaId,
    input.participantId,
    input.round,
    input.amount,
    input.status,
    createdAt,
  );
  return { id, ...input, createdAt };
}

/**
 * Returns all contributions for a given round in a tanda.
 *
 * @param tandaId - UUID of the tanda.
 * @param round - Round number to query.
 * @returns Array of Contribution entities.
 */
export function findContributionsByRound(
  tandaId: string,
  round: number,
): Contribution[] {
  return db
    .prepare(
      'SELECT * FROM contributions WHERE tandaId = ? AND round = ?',
    )
    .all(tandaId, round) as Contribution[];
}

/**
 * Returns the contribution for a specific participant in a specific round.
 *
 * @param participantId - UUID of the participant.
 * @param round - Round number.
 * @returns The Contribution or undefined if none recorded.
 */
export function findContributionByParticipantAndRound(
  participantId: string,
  round: number,
): Contribution | undefined {
  return db
    .prepare(
      'SELECT * FROM contributions WHERE participantId = ? AND round = ?',
    )
    .get(participantId, round) as Contribution | undefined;
}

/**
 * Returns all contributions for a participant ordered by round ascending.
 *
 * @param participantId - UUID of the participant.
 * @returns Array of Contribution entities.
 */
export function findContributionsByParticipant(
  participantId: string,
): Contribution[] {
  return db
    .prepare(
      'SELECT * FROM contributions WHERE participantId = ? ORDER BY round ASC',
    )
    .all(participantId) as Contribution[];
}
