import Database from 'better-sqlite3';
import { Contribution } from '../models/contribution';

export class ContributionRepository {
  constructor(private db: Database.Database) {}

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contributions (
        id TEXT PRIMARY KEY,
        tanda_id TEXT NOT NULL,
        participant_id TEXT NOT NULL,
        round INTEGER NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL,
        paid_at TEXT,
        created_at TEXT NOT NULL
      )
    `);
  }

  create(contribution: Contribution): Contribution {
    const stmt = this.db.prepare(`
      INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status, paid_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      contribution.id,
      contribution.tandaId,
      contribution.participantId,
      contribution.round,
      contribution.amount,
      contribution.status,
      contribution.paidAt?.toISOString() ?? null,
      contribution.createdAt.toISOString()
    );
    return contribution;
  }

  findByRound(tandaId: string, round: number): Contribution[] {
    const stmt = this.db.prepare(`
      SELECT * FROM contributions WHERE tanda_id = ? AND round = ?
      ORDER BY participant_id ASC
    `);
    const rows = stmt.all(tandaId, round) as any[];
    return rows.map(this.mapRowToContribution);
  }

  findByParticipantHistory(participantId: string): Contribution[] {
    const stmt = this.db.prepare(`
      SELECT * FROM contributions WHERE participant_id = ?
      ORDER BY round ASC
    `);
    const rows = stmt.all(participantId) as any[];
    return rows.map(this.mapRowToContribution);
  }

  findByParticipantAndRound(participantId: string, round: number): Contribution | null {
    const stmt = this.db.prepare(`
      SELECT * FROM contributions WHERE participant_id = ? AND round = ?
    `);
    const row = stmt.get(participantId, round) as any;
    if (!row) return null;
    return this.mapRowToContribution(row);
  }

  update(id: string, status: string, amount: number, paidAt: string | null): void {
    const stmt = this.db.prepare(`
      UPDATE contributions SET status = ?, amount = ?, paid_at = ? WHERE id = ?
    `);
    stmt.run(status, amount, paidAt, id);
  }

  private mapRowToContribution(row: any): Contribution {
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
}
