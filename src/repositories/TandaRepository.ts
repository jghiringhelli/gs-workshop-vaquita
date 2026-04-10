import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import type { Tanda, TandaStatus } from '../domain/types.js';
import type { ITandaRepository } from '../domain/interfaces.js';

interface TandaRow {
  id: string;
  name: string;
  organizer_id: string;
  contribution_amount: number;
  status: string;
  current_round: number;
  total_rounds: number;
}

function mapRow(row: TandaRow): Tanda {
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

/** SQLite-backed implementation of ITandaRepository. */
export class TandaRepository implements ITandaRepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Insert a new tanda in FORMING status.
   * @param data - name, organizerId, contributionAmount
   * @returns The created Tanda record
   */
  create(data: { name: string; organizerId: string; contributionAmount: number }): Tanda {
    const id = uuid();
    this.db
      .prepare(
        'INSERT INTO tandas (id, name, organizer_id, contribution_amount) VALUES (?, ?, ?, ?)',
      )
      .run(id, data.name, data.organizerId, data.contributionAmount);
    const row = this.db
      .prepare('SELECT * FROM tandas WHERE id = ?')
      .get(id) as TandaRow;
    return mapRow(row);
  }

  /**
   * Look up a tanda by primary key.
   * @param id - UUID of the tanda
   * @returns Tanda if found, undefined otherwise
   */
  findById(id: string): Tanda | undefined {
    const row = this.db
      .prepare('SELECT * FROM tandas WHERE id = ?')
      .get(id) as TandaRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  /**
   * Return all tandas.
   * @returns Array of all Tanda records
   */
  findAll(): Tanda[] {
    const rows = this.db.prepare('SELECT * FROM tandas').all() as TandaRow[];
    return rows.map(mapRow);
  }

  /**
   * Return all tandas in which the given user is a participant.
   * @param userId - UUID of the user
   * @returns Array of Tanda records
   */
  findByUserId(userId: string): Tanda[] {
    const rows = this.db
      .prepare(
        `SELECT t.* FROM tandas t
         JOIN participants p ON p.tanda_id = t.id
         WHERE p.user_id = ?`,
      )
      .all(userId) as TandaRow[];
    return rows.map(mapRow);
  }

  /**
   * Overwrite mutable tanda fields and return the updated record.
   * @param id - UUID of the tanda
   * @param data - new status, currentRound, and totalRounds
   * @returns Updated Tanda record
   */
  update(
    id: string,
    data: { status: TandaStatus; currentRound: number; totalRounds: number },
  ): Tanda {
    this.db
      .prepare(
        'UPDATE tandas SET status = ?, current_round = ?, total_rounds = ? WHERE id = ?',
      )
      .run(data.status, data.currentRound, data.totalRounds, id);
    const row = this.db
      .prepare('SELECT * FROM tandas WHERE id = ?')
      .get(id) as TandaRow;
    return mapRow(row);
  }
}
