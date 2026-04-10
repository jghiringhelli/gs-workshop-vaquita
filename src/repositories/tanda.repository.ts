import Database from 'better-sqlite3';
import { Tanda } from '../models/tanda';

export class TandaRepository {
  constructor(private db: Database.Database) {}

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tandas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        organizer_id TEXT NOT NULL,
        contribution_amount REAL NOT NULL,
        status TEXT NOT NULL,
        current_round INTEGER NOT NULL,
        total_rounds INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
  }

  create(tanda: Tanda): Tanda {
    const stmt = this.db.prepare(`
      INSERT INTO tandas (id, name, organizer_id, contribution_amount, status, current_round, total_rounds, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      tanda.id,
      tanda.name,
      tanda.organizerId,
      tanda.contributionAmount,
      tanda.status,
      tanda.currentRound,
      tanda.totalRounds,
      tanda.createdAt.toISOString()
    );
    return tanda;
  }

  findById(id: string): Tanda | null {
    const stmt = this.db.prepare(`
      SELECT * FROM tandas WHERE id = ?
    `);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      organizerId: row.organizer_id,
      contributionAmount: row.contribution_amount,
      status: row.status,
      currentRound: row.current_round,
      totalRounds: row.total_rounds,
      createdAt: new Date(row.created_at),
    };
  }

  findAllByOrganizer(organizerId: string): Tanda[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tandas WHERE organizer_id = ?
    `);
    const rows = stmt.all(organizerId) as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      organizerId: row.organizer_id,
      contributionAmount: row.contribution_amount,
      status: row.status,
      currentRound: row.current_round,
      totalRounds: row.total_rounds,
      createdAt: new Date(row.created_at),
    }));
  }

  updateStatus(id: string, status: string): void {
    const stmt = this.db.prepare(`
      UPDATE tandas SET status = ? WHERE id = ?
    `);
    stmt.run(status, id);
  }

  updateRound(id: string, round: number): void {
    const stmt = this.db.prepare(`
      UPDATE tandas SET current_round = ? WHERE id = ?
    `);
    stmt.run(round, id);
  }

  updateStatusAndRound(id: string, status: string, round: number): void {
    const stmt = this.db.prepare(`
      UPDATE tandas SET status = ?, current_round = ? WHERE id = ?
    `);
    stmt.run(status, round, id);
  }
}
