import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import type { Tanda, TandaStatus } from '../types';

/**
 * Inserts a new tanda row in FORMING status.
 * @param name - Tanda name
 * @param organizerId - User UUID of the organizer
 * @param contributionAmount - Fixed amount per round
 * @returns Created Tanda
 */
export function createTanda(name: string, organizerId: string, contributionAmount: number): Tanda {
  const id = uuidv4();
  getDb()
    .prepare(
      `INSERT INTO tandas (id, name, organizerId, contributionAmount, status, currentRound, totalRounds)
       VALUES (?, ?, ?, ?, 'forming', 0, 0)`,
    )
    .run(id, name, organizerId, contributionAmount);
  return findTandaById(id)!;
}

/**
 * Finds a tanda by primary key.
 * @param id - Tanda UUID
 * @returns Tanda or undefined
 */
export function findTandaById(id: string): Tanda | undefined {
  return getDb().prepare('SELECT * FROM tandas WHERE id = ?').get(id) as Tanda | undefined;
}

/**
 * Returns all tandas a user participates in.
 * @param userId - User UUID
 * @returns Array of Tanda
 */
export function findTandasByUserId(userId: string): Tanda[] {
  return getDb()
    .prepare(
      `SELECT t.* FROM tandas t
       JOIN participants p ON p.tandaId = t.id
       WHERE p.userId = ?`,
    )
    .all(userId) as Tanda[];
}

/**
 * Updates tanda status field.
 * @param id - Tanda UUID
 * @param status - New status
 */
export function updateTandaStatus(id: string, status: TandaStatus): void {
  getDb().prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
}

/**
 * Sets both currentRound and totalRounds at once (used on start).
 * @param id - Tanda UUID
 * @param currentRound - Starting round number
 * @param totalRounds - Total rounds in the tanda
 */
export function updateTandaRound(id: string, currentRound: number, totalRounds: number): void {
  getDb()
    .prepare('UPDATE tandas SET currentRound = ?, totalRounds = ? WHERE id = ?')
    .run(currentRound, totalRounds, id);
}

/**
 * Increments currentRound by 1.
 * @param id - Tanda UUID
 */
export function advanceTandaRound(id: string): void {
  getDb().prepare('UPDATE tandas SET currentRound = currentRound + 1 WHERE id = ?').run(id);
}
