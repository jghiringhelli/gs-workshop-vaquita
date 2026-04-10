import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { Contribution, Round } from '../types';
import { IContributionRepository } from './contribution-repository.interface';

/**
 * SQLite implementation of ContributionRepository
 */
export class ContributionRepository implements IContributionRepository {
  constructor(private db: Database.Database) {}

  recordContribution(
    tandaId: string,
    participantId: string,
    round: number,
    amount: number,
    status: 'paid' | 'late' | 'pending'
  ): Contribution {
    const id = uuidv4();
    const now = new Date();
    const paidAt = status === 'paid' ? now : null;

    const stmt = this.db.prepare(`
      INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status, paid_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, tandaId, participantId, round, amount, status, paidAt?.toISOString() || null, now.toISOString());

    return {
      id,
      tandaId,
      participantId,
      round,
      amount,
      status,
      paidAt,
      createdAt: now,
    };
  }

  getById(id: string): Contribution | null {
    const stmt = this.db.prepare(`
      SELECT id, tanda_id, participant_id, round, amount, status, paid_at, created_at
      FROM contributions
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      tandaId: row.tanda_id,
      participantId: row.participant_id,
      round: row.round,
      amount: row.amount,
      status: row.status,
      paidAt: row.paid_at ? new Date(row.paid_at) : null,
      createdAt: new Date(row.created_at),
    };
  }

  getByRound(tandaId: string, round: number): Contribution[] {
    const stmt = this.db.prepare(`
      SELECT id, tanda_id, participant_id, round, amount, status, paid_at, created_at
      FROM contributions
      WHERE tanda_id = ? AND round = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(tandaId, round) as any[];
    return rows.map((row) => ({
      id: row.id,
      tandaId: row.tanda_id,
      participantId: row.participant_id,
      round: row.round,
      amount: row.amount,
      status: row.status,
      paidAt: row.paid_at ? new Date(row.paid_at) : null,
      createdAt: new Date(row.created_at),
    }));
  }

  getParticipantHistory(participantId: string): Contribution[] {
    const stmt = this.db.prepare(`
      SELECT id, tanda_id, participant_id, round, amount, status, paid_at, created_at
      FROM contributions
      WHERE participant_id = ?
      ORDER BY round ASC
    `);

    const rows = stmt.all(participantId) as any[];
    return rows.map((row) => ({
      id: row.id,
      tandaId: row.tanda_id,
      participantId: row.participant_id,
      round: row.round,
      amount: row.amount,
      status: row.status,
      paidAt: row.paid_at ? new Date(row.paid_at) : null,
      createdAt: new Date(row.created_at),
    }));
  }

  updateStatus(id: string, status: 'paid' | 'late' | 'missed'): void {
    const now = new Date().toISOString();
    const paidAt = status === 'paid' ? now : null;

    const stmt = this.db.prepare(`
      UPDATE contributions SET status = ?, paid_at = ? WHERE id = ?
    `);

    stmt.run(status, paidAt, id);
  }

  getOrCreateRound(tandaId: string, round: number): Round {
    const existing = this.getRound(tandaId, round);
    if (existing) return existing;

    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO rounds (id, tanda_id, round_number, status)
      VALUES (?, ?, ?, 'pending')
    `);

    stmt.run(id, tandaId, round);

    return {
      tandaId,
      round,
      recipientUserId: null,
      totalCollected: 0,
      status: 'pending',
    };
  }

  updateRound(
    tandaId: string,
    round: number,
    recipientUserId: string | null,
    totalCollected: number,
    status: 'pending' | 'completed'
  ): void {
    const stmt = this.db.prepare(`
      UPDATE rounds SET recipient_user_id = ?, total_collected = ?, status = ?
      WHERE tanda_id = ? AND round_number = ?
    `);

    stmt.run(recipientUserId, totalCollected, status, tandaId, round);
  }

  getRound(tandaId: string, round: number): Round | null {
    const stmt = this.db.prepare(`
      SELECT tanda_id, round_number, recipient_user_id, total_collected, status
      FROM rounds
      WHERE tanda_id = ? AND round_number = ?
    `);

    const row = stmt.get(tandaId, round) as any;
    if (!row) return null;

    return {
      tandaId: row.tanda_id,
      round: row.round_number,
      recipientUserId: row.recipient_user_id,
      totalCollected: row.total_collected,
      status: row.status,
    };
  }

  getRounds(tandaId: string): Round[] {
    const stmt = this.db.prepare(`
      SELECT tanda_id, round_number, recipient_user_id, total_collected, status
      FROM rounds
      WHERE tanda_id = ?
      ORDER BY round_number ASC
    `);

    const rows = stmt.all(tandaId) as any[];
    return rows.map((row) => ({
      tandaId: row.tanda_id,
      round: row.round_number,
      recipientUserId: row.recipient_user_id,
      totalCollected: row.total_collected,
      status: row.status,
    }));
  }
}
