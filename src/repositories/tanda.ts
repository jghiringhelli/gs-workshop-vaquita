import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { NotFoundError, ValidationError } from '../errors';

export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  currentRound: number;
  totalRounds: number;
  created_at: string;
}

export class TandaRepository {
  constructor(private db: Database.Database) {}

  create(name: string, organizerId: string, contributionAmount: number, totalRounds: number): Tanda {
    const id = uuid();
    const now = new Date().toISOString();

    const result = this.db
      .prepare(
        `
        INSERT INTO tandas (id, name, organizer_id, contribution_amount, total_rounds, status, current_round, created_at)
        VALUES (?, ?, ?, ?, ?, 'forming', 0, ?)
      `
      )
      .run(id, name, organizerId, contributionAmount, totalRounds, now);

    if (!result.changes) {
      throw new ValidationError('Failed to create tanda');
    }

    return {
      id,
      name,
      organizerId,
      contributionAmount,
      totalRounds,
      status: 'forming',
      currentRound: 0,
      created_at: now,
    };
  }

  getById(id: string): Tanda {
    const row = this.db
      .prepare(
        `
        SELECT id, name, organizer_id, contribution_amount, status, current_round, total_rounds, created_at
        FROM tandas
        WHERE id = ? AND is_deleted = 0
      `
      )
      .get(id) as Record<string, unknown>;

    if (!row) {
      throw new NotFoundError('Tanda', id);
    }

    return this.normalizeTanda(row);
  }

  list(organizerId?: string): Tanda[] {
    let query = `
      SELECT id, name, organizer_id, contribution_amount, status, current_round, total_rounds, created_at
      FROM tandas
      WHERE is_deleted = 0
    `;

    if (organizerId) {
      query += ` AND organizer_id = ?`;
    }

    query += ` ORDER BY created_at DESC`;

    const rows = (
      organizerId ? this.db.prepare(query).all(organizerId) : this.db.prepare(query).all()
    ) as Record<string, unknown>[];

    return rows.map((row) => this.normalizeTanda(row));
  }

  update(id: string, updates: { status?: string; currentRound?: number }): Tanda {
    const current = this.getById(id);

    const setClauses: string[] = [];
    const params: (string | number)[] = [];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }

    if (updates.currentRound !== undefined) {
      setClauses.push('current_round = ?');
      params.push(updates.currentRound);
    }

    if (setClauses.length === 0) {
      return current;
    }

    params.push(id);

    const result = this.db
      .prepare(
        `
        UPDATE tandas
        SET ${setClauses.join(', ')}
        WHERE id = ? AND is_deleted = 0
      `
      )
      .run(...params);

    if (!result.changes) {
      throw new ValidationError('Failed to update tanda');
    }

    return this.getById(id);
  }

  cancel(id: string): Tanda {
    const tanda = this.getById(id);

    if (tanda.status === 'forming') {
      // Hard delete if still forming
      this.db.prepare('DELETE FROM tandas WHERE id = ?').run(id);
      return tanda;
    } else {
      // Soft delete if already started
      this.db.prepare('UPDATE tandas SET is_deleted = 1, status = ? WHERE id = ?').run('cancelled', id);
      return { ...tanda, status: 'cancelled' };
    }
  }

  private normalizeTanda(row: Record<string, unknown>): Tanda {
    return {
      id: row.id as string,
      name: row.name as string,
      organizerId: row.organizer_id as string,
      contributionAmount: row.contribution_amount as number,
      status: row.status as 'forming' | 'active' | 'completed' | 'cancelled',
      currentRound: row.current_round as number,
      totalRounds: row.total_rounds as number,
      created_at: row.created_at as string,
    };
  }
}
