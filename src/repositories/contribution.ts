import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { NotFoundError, ValidationError } from '../errors';

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
  penaltyApplied: number;
  paidAt: string | null;
  created_at: string;
}

export class ContributionRepository {
  constructor(private db: Database.Database) {}

  create(
    tandaId: string,
    participantId: string,
    round: number,
    amount: number,
    status: 'pending' | 'paid' | 'late' | 'missed' = 'pending'
  ): Contribution {
    const id = uuid();
    const now = new Date().toISOString();

    try {
      const result = this.db
        .prepare(
          `
          INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
        )
        .run(id, tandaId, participantId, round, amount, status, now);

      if (!result.changes) {
        throw new ValidationError('Failed to create contribution');
      }

      return {
        id,
        tandaId,
        participantId,
        round,
        amount,
        status,
        penaltyApplied: 0,
        paidAt: null,
        created_at: now,
      };
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        throw new ValidationError(
          `Contribution already exists for round ${round}`,
          'DUPLICATE_CONTRIBUTION'
        );
      }
      throw error;
    }
  }

  getById(id: string): Contribution {
    const row = this.db
      .prepare(
        `
        SELECT id, tanda_id, participant_id, round, amount, status, penalty_applied, paid_at, created_at
        FROM contributions
        WHERE id = ?
      `
      )
      .get(id) as any;

    if (!row) {
      throw new NotFoundError('Contribution', id);
    }

    return this.normalizeContribution(row);
  }

  getByRound(tandaId: string, round: number): Contribution[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, tanda_id, participant_id, round, amount, status, penalty_applied, paid_at, created_at
        FROM contributions
        WHERE tanda_id = ? AND round = ?
        ORDER BY created_at ASC
      `
      )
      .all(tandaId, round) as any[];

    return rows.map((row) => this.normalizeContribution(row));
  }

  getHistory(participantId: string): Contribution[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, tanda_id, participant_id, round, amount, status, penalty_applied, paid_at, created_at
        FROM contributions
        WHERE participant_id = ?
        ORDER BY created_at DESC
      `
      )
      .all(participantId) as any[];

    return rows.map((row) => this.normalizeContribution(row));
  }

  getOrCreate(
    tandaId: string,
    participantId: string,
    round: number,
    amount: number
  ): Contribution {
    const existing = this.db
      .prepare(
        `
        SELECT id, tanda_id, participant_id, round, amount, status, penalty_applied, paid_at, created_at
        FROM contributions
        WHERE tanda_id = ? AND participant_id = ? AND round = ?
      `
      )
      .get(tandaId, participantId, round) as any;

    if (existing) {
      return this.normalizeContribution(existing);
    }

    return this.create(tandaId, participantId, round, amount, 'pending');
  }

  updateStatus(
    id: string,
    status: 'pending' | 'paid' | 'late' | 'missed',
    paidAt?: string,
    penaltyApplied: number = 0
  ): Contribution {
    const params: any[] = [status, penaltyApplied];

    if (paidAt) {
      params.push(paidAt);
      params.push(id);
      this.db
        .prepare(
          `
          UPDATE contributions
          SET status = ?, penalty_applied = ?, paid_at = ?
          WHERE id = ?
        `
        )
        .run(...params);
    } else {
      params.push(id);
      this.db
        .prepare(
          `
          UPDATE contributions
          SET status = ?, penalty_applied = ?
          WHERE id = ?
        `
        )
        .run(...params);
    }

    return this.getById(id);
  }

  getLatePending(tandaId: string, round: number): Contribution[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, tanda_id, participant_id, round, amount, status, penalty_applied, paid_at, created_at
        FROM contributions
        WHERE tanda_id = ? AND round = ? AND status IN ('pending', 'late')
        ORDER BY created_at ASC
      `
      )
      .all(tandaId, round) as any[];

    return rows.map((row) => this.normalizeContribution(row));
  }

  getMissedByParticipant(participantId: string, limit: number = 2): Contribution[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, tanda_id, participant_id, round, amount, status, penalty_applied, paid_at, created_at
        FROM contributions
        WHERE participant_id = ? AND status = 'missed'
        ORDER BY round DESC
        LIMIT ?
      `
      )
      .all(participantId, limit) as any[];

    return rows.map((row) => this.normalizeContribution(row));
  }

  private normalizeContribution(row: any): Contribution {
    return {
      id: row.id,
      tandaId: row.tanda_id,
      participantId: row.participant_id,
      round: row.round,
      amount: row.amount,
      status: row.status,
      penaltyApplied: row.penalty_applied,
      paidAt: row.paid_at,
      created_at: row.created_at,
    };
  }
}
