import { v4 as uuidv4 } from 'uuid';
import type { DB } from '../db/db';

export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';

export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
  roundStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTandaData {
  name: string;
  organizerId: string;
  contributionAmount: number;
}

export function createTandasRepo(db: DB) {
  return {
    findById(id: string): Tanda | undefined {
      return db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as Tanda | undefined;
    },

    findByUserId(userId: string): Tanda[] {
      return db.prepare(`
        SELECT t.* FROM tandas t
        INNER JOIN participants p ON p.tandaId = t.id
        WHERE p.userId = ?
        ORDER BY t.createdAt ASC
      `).all(userId) as Tanda[];
    },

    findAll(): Tanda[] {
      return db.prepare('SELECT * FROM tandas ORDER BY createdAt ASC').all() as Tanda[];
    },

    create(data: CreateTandaData): Tanda {
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO tandas (id, name, organizerId, contributionAmount, status, currentRound, totalRounds, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 'forming', 0, 0, ?, ?)
      `).run(id, data.name, data.organizerId, data.contributionAmount, now, now);
      return this.findById(id)!;
    },

    updateStatus(id: string, status: TandaStatus): void {
      db.prepare('UPDATE tandas SET status = ?, updatedAt = ? WHERE id = ?')
        .run(status, new Date().toISOString(), id);
    },

    startTanda(id: string, totalRounds: number, roundStartedAt: string): void {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE tandas
        SET status = 'active', currentRound = 1, totalRounds = ?, roundStartedAt = ?, updatedAt = ?
        WHERE id = ?
      `).run(totalRounds, roundStartedAt, now, id);
    },

    advanceRound(id: string, newRound: number, roundStartedAt: string): void {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE tandas SET currentRound = ?, roundStartedAt = ?, updatedAt = ? WHERE id = ?
      `).run(newRound, roundStartedAt, now, id);
    },

    completeTanda(id: string): void {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE tandas SET status = 'completed', updatedAt = ? WHERE id = ?
      `).run(now, id);
    },
  };
}

export type TandasRepo = ReturnType<typeof createTandasRepo>;
