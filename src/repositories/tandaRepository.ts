import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  currentRound: number;
  totalRounds: number;
}

export class TandaRepository {
  constructor(private db: Database.Database) {}

  findAll(userId?: string): Tanda[] {
    if (userId) {
      return this.db.prepare(`
        SELECT DISTINCT t.* FROM tandas t
        JOIN participants p ON p.tandaId = t.id
        WHERE p.userId = ?
      `).all(userId) as Tanda[];
    }
    return this.db.prepare('SELECT * FROM tandas').all() as Tanda[];
  }

  findById(id: string): Tanda | undefined {
    return this.db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as Tanda | undefined;
  }

  create(data: { name: string; organizerId: string; contributionAmount: number }): Tanda {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO tandas (id, name, organizerId, contributionAmount, status, currentRound, totalRounds)
      VALUES (?, ?, ?, ?, 'forming', 1, 0)
    `).run(id, data.name, data.organizerId, data.contributionAmount);
    return this.findById(id) as Tanda;
  }

  updateStatus(id: string, status: Tanda['status']): void {
    this.db.prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
  }

  updateCurrentRound(id: string, currentRound: number): void {
    this.db.prepare('UPDATE tandas SET currentRound = ? WHERE id = ?').run(currentRound, id);
  }

  updateTotalRounds(id: string, totalRounds: number): void {
    this.db.prepare('UPDATE tandas SET totalRounds = ? WHERE id = ?').run(totalRounds, id);
  }
}
