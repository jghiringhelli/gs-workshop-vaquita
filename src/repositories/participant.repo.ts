import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import type { Participant, ParticipantRole } from '../types';

/**
 * Inserts a participant row with no rotation position yet.
 * @param userId - User UUID
 * @param tandaId - Tanda UUID
 * @param role - 'organizer' or 'member'
 * @returns Created Participant
 */
export function createParticipant(
  userId: string,
  tandaId: string,
  role: ParticipantRole,
): Participant {
  const id = uuidv4();
  getDb()
    .prepare(
      `INSERT INTO participants (id, userId, tandaId, role, rotationPosition, isDefaulter)
       VALUES (?, ?, ?, ?, NULL, 0)`,
    )
    .run(id, userId, tandaId, role);
  return findParticipantById(id)!;
}

/**
 * Returns all participants for a tanda.
 * @param tandaId - Tanda UUID
 * @returns Array of Participant
 */
export function findParticipantsByTanda(tandaId: string): Participant[] {
  return getDb()
    .prepare('SELECT * FROM participants WHERE tandaId = ?')
    .all(tandaId) as Participant[];
}

/**
 * Finds a participant by primary key.
 * @param id - Participant UUID
 * @returns Participant or undefined
 */
export function findParticipantById(id: string): Participant | undefined {
  return getDb()
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(id) as Participant | undefined;
}

/**
 * Finds the junction row for a user+tanda pair.
 * @param userId - User UUID
 * @param tandaId - Tanda UUID
 * @returns Participant or undefined
 */
export function findParticipantByUserAndTanda(
  userId: string,
  tandaId: string,
): Participant | undefined {
  return getDb()
    .prepare('SELECT * FROM participants WHERE userId = ? AND tandaId = ?')
    .get(userId, tandaId) as Participant | undefined;
}

/**
 * Counts participants in a tanda.
 * @param tandaId - Tanda UUID
 * @returns Count
 */
export function countParticipants(tandaId: string): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) as count FROM participants WHERE tandaId = ?')
    .get(tandaId) as { count: number };
  return row.count;
}

/**
 * Assigns rotation positions to participants in the given order.
 * @param tandaId - Tanda UUID
 * @param orderedIds - Participant IDs in rotation order
 */
export function assignRotationPositions(tandaId: string, orderedIds: string[]): void {
  const stmt = getDb().prepare('UPDATE participants SET rotationPosition = ? WHERE id = ?');
  const tx = getDb().transaction(() => {
    orderedIds.forEach((id, i) => stmt.run(i + 1, id));
  });
  tx();
}

/**
 * Marks a participant as a defaulter.
 * @param id - Participant UUID
 */
export function setDefaulter(id: string): void {
  getDb().prepare('UPDATE participants SET isDefaulter = 1 WHERE id = ?').run(id);
}
