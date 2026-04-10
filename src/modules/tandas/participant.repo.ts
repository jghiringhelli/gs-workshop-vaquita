import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db';

/** Participant role values. */
export type ParticipantRole = 'organizer' | 'member';

/** Represents a participant record as returned from the database. */
export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  rotationPosition: number | null;
}

/** Fields required to create a participant row. */
export interface CreateParticipantData {
  userId: string;
  tandaId: string;
  role: ParticipantRole;
}

/**
 * Inserts a new participant record and returns it.
 *
 * @param data - Participant creation data.
 * @returns The newly created participant.
 */
export function createParticipant(data: CreateParticipantData): Participant {
  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO participants (id, userId, tandaId, role, rotationPosition)
    VALUES (?, ?, ?, ?, NULL)
  `).run(id, data.userId, data.tandaId, data.role);
  return { id, userId: data.userId, tandaId: data.tandaId, role: data.role, rotationPosition: null };
}

/**
 * Finds a participant by their primary key.
 *
 * @param id - The participant's UUID.
 * @returns The participant record, or undefined if not found.
 */
export function findParticipantById(id: string): Participant | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as
    | Participant
    | undefined;
}

/**
 * Returns all participants for a given tanda.
 *
 * @param tandaId - The tanda's UUID.
 * @returns Array of participant records ordered by rotationPosition (nulls last).
 */
export function findParticipantsByTandaId(tandaId: string): Participant[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM participants
    WHERE tandaId = ?
    ORDER BY rotationPosition NULLS LAST, id
  `).all(tandaId) as Participant[];
}

/**
 * Finds a participant by their user ID and tanda ID (the unique membership record).
 *
 * @param userId - The user's UUID.
 * @param tandaId - The tanda's UUID.
 * @returns The participant record, or undefined if the user is not in this tanda.
 */
export function findParticipantByUserAndTanda(
  userId: string,
  tandaId: string,
): Participant | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM participants WHERE userId = ? AND tandaId = ?
  `).get(userId, tandaId) as Participant | undefined;
}

/**
 * Returns the number of participants currently in a tanda.
 *
 * @param tandaId - The tanda's UUID.
 * @returns Count of participants.
 */
export function countParticipantsByTandaId(tandaId: string): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM participants WHERE tandaId = ?')
    .get(tandaId) as { count: number };
  return row.count;
}

/**
 * Batch-updates the rotationPosition for a list of participants.
 * Used when starting a tanda to lock in the shuffled rotation order.
 *
 * @param participants - Array of participants with their new rotationPosition values.
 */
export function updateRotationPositions(
  participants: Array<Pick<Participant, 'id' | 'rotationPosition'>>,
): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE participants SET rotationPosition = ? WHERE id = ?');
  const updateAll = db.transaction(
    (items: Array<Pick<Participant, 'id' | 'rotationPosition'>>) => {
      for (const p of items) {
        stmt.run(p.rotationPosition, p.id);
      }
    },
  );
  updateAll(participants);
}
