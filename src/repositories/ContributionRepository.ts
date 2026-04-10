/**
 * Contribution Repository
 * Handles all contribution persistence operations
 */

import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { Contribution, ContributionStatus, ContributionRepository as IContributionRepository } from '../types/index.js';

export class ContributionRepository implements IContributionRepository {
  constructor(private db: Database.Database) {}

  create(contributionData: Omit<Contribution, 'id' | 'createdAt'>): Contribution {
    const id = uuidv4();
    const createdAt = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO contributions (
        id, tanda_id, participant_id, round, amount, status, paid_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      contributionData.tandaId,
      contributionData.participantId,
      contributionData.round,
      contributionData.amount,
      contributionData.status,
      contributionData.paidAt ? contributionData.paidAt.toISOString() : null,
      createdAt.toISOString(),
    );

    return {
      id,
      tandaId: contributionData.tandaId,
      participantId: contributionData.participantId,
      round: contributionData.round,
      amount: contributionData.amount,
      status: contributionData.status,
      paidAt: contributionData.paidAt,
      createdAt,
    };
  }

  findById(id: string): Contribution | null {
    const stmt = this.db.prepare('SELECT * FROM contributions WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.mapRowToContribution(row) : null;
  }

  findByTandaAndRound(tandaId: string, round: number): Contribution[] {
    const stmt = this.db.prepare(
      'SELECT * FROM contributions WHERE tanda_id = ? AND round = ? ORDER BY created_at ASC',
    );
    const rows = stmt.all(tandaId, round) as any[];

    return rows.map((row) => this.mapRowToContribution(row));
  }

  findByParticipantAndTanda(participantId: string, tandaId: string): Contribution[] {
    const stmt = this.db.prepare(
      'SELECT * FROM contributions WHERE participant_id = ? AND tanda_id = ? ORDER BY round ASC',
    );
    const rows = stmt.all(participantId, tandaId) as any[];

    return rows.map((row) => this.mapRowToContribution(row));
  }

  findPendingByRound(tandaId: string, round: number): Contribution[] {
    const stmt = this.db.prepare(
      'SELECT * FROM contributions WHERE tanda_id = ? AND round = ? AND status = ? ORDER BY created_at ASC',
    );
    const rows = stmt.all(tandaId, round, 'pending') as any[];

    return rows.map((row) => this.mapRowToContribution(row));
  }

  update(id: string, data: Partial<Omit<Contribution, 'id' | 'createdAt'>>): Contribution {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.amount !== undefined) {
      updates.push('amount = ?');
      values.push(data.amount);
    }
    if (data.paidAt !== undefined) {
      updates.push('paid_at = ?');
      values.push(data.paidAt ? data.paidAt.toISOString() : null);
    }

    if (updates.length === 0) {
      const updated = this.findById(id);
      if (!updated) {
        throw new Error(`Contribution with id ${id} not found`);
      }
      return updated;
    }

    values.push(id);

    const stmt = this.db.prepare(`UPDATE contributions SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    const updated = this.findById(id);
    if (!updated) {
      throw new Error(`Contribution with id ${id} not found after update`);
    }

    return updated;
  }

  private mapRowToContribution(row: any): Contribution {
    return {
      id: row.id,
      tandaId: row.tanda_id,
      participantId: row.participant_id,
      round: row.round,
      amount: row.amount,
      status: row.status as ContributionStatus,
      paidAt: row.paid_at ? new Date(row.paid_at) : null,
      createdAt: new Date(row.created_at),
    };
  }
}
