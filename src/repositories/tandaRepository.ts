import Database from 'better-sqlite3';
import { Tanda, TandaStatus } from '../models/types';
import { NotFoundError } from '../errors/customErrors';

export class TandaRepository {
  constructor(private db: Database.Database) {}

  create(name: string, organizerId: number, contributionAmount: number): Tanda {
    const stmt = this.db.prepare(`
      INSERT INTO tandas (name, organizer_id, contribution_amount, status, current_round, total_rounds)
      VALUES (?, ?, ?, 'forming', 0, 0)
    `);

    const result = stmt.run(name, organizerId, contributionAmount);
    return this.findById(result.lastInsertRowid as number)!;
  }

  findById(id: number): Tanda | null {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        name,
        organizer_id as organizerId,
        contribution_amount as contributionAmount,
        status,
        current_round as currentRound,
        total_rounds as totalRounds,
        created_at as createdAt,
        started_at as startedAt,
        completed_at as completedAt
      FROM tandas
      WHERE id = ?
    `);

    const row = stmt.get(id) as Tanda | undefined;
    return row || null;
  }

  findByUserId(userId: number): Tanda[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT
        t.id,
        t.name,
        t.organizer_id as organizerId,
        t.contribution_amount as contributionAmount,
        t.status,
        t.current_round as currentRound,
        t.total_rounds as totalRounds,
        t.created_at as createdAt,
        t.started_at as startedAt,
        t.completed_at as completedAt
      FROM tandas t
      INNER JOIN participants p ON t.id = p.tanda_id
      WHERE p.user_id = ?
      ORDER BY t.id
    `);

    return stmt.all(userId) as Tanda[];
  }

  updateStatus(id: number, status: TandaStatus): void {
    const stmt = this.db.prepare(`
      UPDATE tandas
      SET status = ?
      WHERE id = ?
    `);

    const result = stmt.run(status, id);
    if (result.changes === 0) {
      throw new NotFoundError(`Tanda with id ${id} not found`);
    }
  }

  incrementRound(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE tandas
      SET current_round = current_round + 1
      WHERE id = ?
    `);

    const result = stmt.run(id);
    if (result.changes === 0) {
      throw new NotFoundError(`Tanda with id ${id} not found`);
    }
  }

  setTotalRounds(id: number, total: number): void {
    const stmt = this.db.prepare(`
      UPDATE tandas
      SET total_rounds = ?
      WHERE id = ?
    `);

    const result = stmt.run(total, id);
    if (result.changes === 0) {
      throw new NotFoundError(`Tanda with id ${id} not found`);
    }
  }

  setStartedAt(id: number, timestamp: string): void {
    const stmt = this.db.prepare(`
      UPDATE tandas
      SET started_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(timestamp, id);
    if (result.changes === 0) {
      throw new NotFoundError(`Tanda with id ${id} not found`);
    }
  }

  setCompletedAt(id: number, timestamp: string): void {
    const stmt = this.db.prepare(`
      UPDATE tandas
      SET completed_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(timestamp, id);
    if (result.changes === 0) {
      throw new NotFoundError(`Tanda with id ${id} not found`);
    }
  }

  setCurrentRound(id: number, round: number): void {
    const stmt = this.db.prepare(`
      UPDATE tandas
      SET current_round = ?
      WHERE id = ?
    `);

    const result = stmt.run(round, id);
    if (result.changes === 0) {
      throw new NotFoundError(`Tanda with id ${id} not found`);
    }
  }
}
