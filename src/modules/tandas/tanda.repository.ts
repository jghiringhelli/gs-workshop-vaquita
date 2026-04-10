import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Tanda, TandaStatus } from './tanda.entity.js';
import { ITandaRepository } from './tanda.port.js';

interface TandaRow {
  id: string;
  name: string;
  organizer_id: string;
  contribution_amount: number;
  status: string;
  current_round: number;
  total_rounds: number;
}

/** Maps a DB row to a Tanda entity */
function rowToTanda(row: TandaRow): Tanda {
  return {
    id: row.id,
    name: row.name,
    organizerId: row.organizer_id,
    contributionAmount: row.contribution_amount,
    status: row.status as TandaStatus,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
  };
}

/** SQLite implementation of ITandaRepository */
export class TandaRepository implements ITandaRepository {
  /** @param db - The shared SQLite connection */
  constructor(private readonly db: Database.Database) {}

  /**
   * Persists a new tanda.
   * @param data - Tanda fields excluding the generated id
   * @returns The created Tanda with id
   */
  create(data: Omit<Tanda, 'id'>): Tanda {
    const id = uuidv4();
    this.db
      .prepare(
        `INSERT INTO tandas (id, name, organizer_id, contribution_amount, status, current_round, total_rounds)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, data.name, data.organizerId, data.contributionAmount, data.status, data.currentRound, data.totalRounds);
    return { id, ...data };
  }

  /**
   * Finds a tanda by id.
   * @param id - UUID of the tanda
   * @returns The Tanda or null if not found
   */
  findById(id: string): Tanda | null {
    const row = this.db
      .prepare('SELECT * FROM tandas WHERE id = ?')
      .get(id) as TandaRow | undefined;
    return row ? rowToTanda(row) : null;
  }

  /**
   * Lists tandas where the user is a participant.
   * @param userId - UUID of the user
   * @returns Array of Tanda records
   */
  findByUserId(userId: string): Tanda[] {
    const rows = this.db
      .prepare(
        `SELECT t.* FROM tandas t
         INNER JOIN participants p ON p.tanda_id = t.id
         WHERE p.user_id = ?`,
      )
      .all(userId) as TandaRow[];
    return rows.map(rowToTanda);
  }

  /**
   * Updates mutable tanda fields.
   * @param id      - UUID of the tanda to update
   * @param updates - Partial tanda fields to apply
   * @returns The updated Tanda
   */
  update(id: string, updates: Partial<Omit<Tanda, 'id'>>): Tanda {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.currentRound !== undefined) { fields.push('current_round = ?'); values.push(updates.currentRound); }
    if (updates.totalRounds !== undefined) { fields.push('total_rounds = ?'); values.push(updates.totalRounds); }

    if (fields.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE tandas SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.findById(id)!;
  }
}

