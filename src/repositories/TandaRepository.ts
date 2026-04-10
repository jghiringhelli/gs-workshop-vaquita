/**
 * Tanda Repository
 * Handles all tanda persistence operations
 */

import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { Tanda, TandaStatus, TandaRepository as ITandaRepository } from '../types/index.js';

export class TandaRepository implements ITandaRepository {
  constructor(private db: Database.Database) {}

  create(tandaData: Omit<Tanda, 'id' | 'createdAt' | 'updatedAt'>): Tanda {
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO tandas (
        id, name, organizer_id, contribution_amount, status,
        current_round, total_rounds, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      tandaData.name,
      tandaData.organizerId,
      tandaData.contributionAmount,
      tandaData.status,
      tandaData.currentRound,
      tandaData.totalRounds,
      createdAt.toISOString(),
      updatedAt.toISOString(),
    );

    return {
      id,
      name: tandaData.name,
      organizerId: tandaData.organizerId,
      contributionAmount: tandaData.contributionAmount,
      status: tandaData.status,
      currentRound: tandaData.currentRound,
      totalRounds: tandaData.totalRounds,
      createdAt,
      updatedAt,
    };
  }

  findById(id: string): Tanda | null {
    const stmt = this.db.prepare('SELECT * FROM tandas WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.mapRowToTanda(row) : null;
  }

  findByOrganizerId(organizerId: string): Tanda[] {
    const stmt = this.db.prepare(
      'SELECT * FROM tandas WHERE organizer_id = ? ORDER BY created_at DESC',
    );
    const rows = stmt.all(organizerId) as any[];

    return rows.map((row) => this.mapRowToTanda(row));
  }

  update(id: string, data: Partial<Omit<Tanda, 'id' | 'createdAt' | 'updatedAt'>>): Tanda {
    const updatedAt = new Date();

    // Build dynamic UPDATE statement
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.currentRound !== undefined) {
      updates.push('current_round = ?');
      values.push(data.currentRound);
    }
    if (data.totalRounds !== undefined) {
      updates.push('total_rounds = ?');
      values.push(data.totalRounds);
    }
    if (data.contributionAmount !== undefined) {
      updates.push('contribution_amount = ?');
      values.push(data.contributionAmount);
    }

    updates.push('updated_at = ?');
    values.push(updatedAt.toISOString());
    values.push(id);

    const stmt = this.db.prepare(
      `UPDATE tandas SET ${updates.join(', ')} WHERE id = ?`,
    );
    stmt.run(...values);

    const updated = this.findById(id);
    if (!updated) {
      throw new Error(`Tanda with id ${id} not found after update`);
    }

    return updated;
  }

  list(): Tanda[] {
    const stmt = this.db.prepare('SELECT * FROM tandas ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map((row) => this.mapRowToTanda(row));
  }

  private mapRowToTanda(row: any): Tanda {
    return {
      id: row.id,
      name: row.name,
      organizerId: row.organizer_id,
      contributionAmount: row.contribution_amount,
      status: row.status as TandaStatus,
      currentRound: row.current_round,
      totalRounds: row.total_rounds,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
