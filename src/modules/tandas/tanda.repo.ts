import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db';

/** Tanda status values. */
export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';

/** Represents a tanda record as returned from the database. */
export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
  roundStartedAt: string | null;
}

/** Fields accepted when creating a new tanda row. */
export interface CreateTandaData {
  name: string;
  organizerId: string;
  contributionAmount: number;
}

/** Subset of Tanda fields that can be updated. */
export type UpdateTandaData = Partial<
  Pick<Tanda, 'status' | 'currentRound' | 'totalRounds' | 'roundStartedAt'>
>;

/**
 * Inserts a new tanda record and returns it.
 *
 * @param data - Tanda creation data.
 * @returns The newly created tanda.
 */
export function createTanda(data: CreateTandaData): Tanda {
  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO tandas (id, name, organizerId, contributionAmount, status, currentRound, totalRounds)
    VALUES (?, ?, ?, ?, 'forming', 1, 0)
  `).run(id, data.name, data.organizerId, data.contributionAmount);

  const tanda = findTandaById(id);
  if (tanda === undefined) throw new Error('Failed to create tanda');
  return tanda;
}

/**
 * Finds a tanda by its primary key.
 *
 * @param id - The tanda's UUID.
 * @returns The tanda record, or undefined if not found.
 */
export function findTandaById(id: string): Tanda | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as Tanda | undefined;
}

/**
 * Returns all tandas where the given user is a participant (any role).
 *
 * @param userId - The user's UUID.
 * @returns Array of tanda records.
 */
export function findTandasByUserId(userId: string): Tanda[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.* FROM tandas t
    JOIN participants p ON p.tandaId = t.id
    WHERE p.userId = ?
    ORDER BY t.name
  `).all(userId) as Tanda[];
}

/**
 * Applies a partial update to a tanda and returns the updated record.
 *
 * @param id - The tanda's UUID.
 * @param updates - Fields to update.
 * @returns The updated tanda record.
 */
export function updateTanda(id: string, updates: UpdateTandaData): Tanda {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.currentRound !== undefined) {
    fields.push('currentRound = ?');
    values.push(updates.currentRound);
  }
  if (updates.totalRounds !== undefined) {
    fields.push('totalRounds = ?');
    values.push(updates.totalRounds);
  }
  if (updates.roundStartedAt !== undefined) {
    fields.push('roundStartedAt = ?');
    values.push(updates.roundStartedAt);
  }

  if (fields.length === 0) {
    const existing = findTandaById(id);
    if (existing === undefined) throw new Error(`Tanda '${id}' not found`);
    return existing;
  }

  values.push(id);
  db.prepare(`UPDATE tandas SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const updated = findTandaById(id);
  if (updated === undefined) throw new Error(`Tanda '${id}' not found after update`);
  return updated;
}
