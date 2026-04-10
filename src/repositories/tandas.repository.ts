import type Database from 'better-sqlite3';
import type { Tanda, TandaStatus } from '../types';

export function createTandasRepository(db: Database.Database) {
  return {
    findAll(): Tanda[] {
      return db.prepare('SELECT * FROM tandas').all() as Tanda[];
    },
    findById(id: number): Tanda | undefined {
      return db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as Tanda | undefined;
    },
    findByUserId(userId: number): Tanda[] {
      return db.prepare(`
        SELECT t.* FROM tandas t
        INNER JOIN participants p ON p.tanda_id = t.id
        WHERE p.user_id = ?
      `).all(userId) as Tanda[];
    },
    create(name: string, organizerId: number, contributionAmount: number): Tanda {
      return db.prepare(`
        INSERT INTO tandas (name, organizer_id, contribution_amount)
        VALUES (?, ?, ?) RETURNING *
      `).get(name, organizerId, contributionAmount) as Tanda;
    },
    updateStatus(id: number, status: TandaStatus): void {
      db.prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
    },
    activateWithRound(id: number, totalRounds: number): void {
      db.prepare(`
        UPDATE tandas SET status = 'active', current_round = 1, total_rounds = ? WHERE id = ?
      `).run(totalRounds, id);
    },
    advanceRound(id: number, nextRound: number): void {
      db.prepare('UPDATE tandas SET current_round = ? WHERE id = ?').run(nextRound, id);
    },
  };
}

export type TandasRepository = ReturnType<typeof createTandasRepository>;
