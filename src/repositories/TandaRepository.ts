import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Tanda, TandaStatus } from '../models';

export class TandaRepository {
  constructor(private readonly db: Database.Database) {}

  create(data: Omit<Tanda, 'id' | 'status' | 'currentRound' | 'totalRounds'>): Tanda {
    const tanda: Tanda = {
      id: uuidv4(),
      ...data,
      status: 'forming',
      currentRound: 1,
      totalRounds: 0,
    };
    this.db.prepare(
      'INSERT INTO tandas (id, name, organizerId, contributionAmount, status, currentRound, totalRounds) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(tanda.id, tanda.name, tanda.organizerId, tanda.contributionAmount, tanda.status, tanda.currentRound, tanda.totalRounds);
    return tanda;
  }

  findById(id: string): Tanda | undefined {
    return this.db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as Tanda | undefined;
  }

  findByOrganizerId(organizerId: string): Tanda[] {
    return this.db.prepare('SELECT * FROM tandas WHERE organizerId = ?').all(organizerId) as Tanda[];
  }

  findByUserId(userId: string): Tanda[] {
    return this.db.prepare(`
      SELECT t.* FROM tandas t
      INNER JOIN participants p ON p.tandaId = t.id
      WHERE p.userId = ?
    `).all(userId) as Tanda[];
  }

  updateStatus(id: string, status: TandaStatus): void {
    this.db.prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
  }

  updateTotalRounds(id: string, totalRounds: number): void {
    this.db.prepare('UPDATE tandas SET totalRounds = ? WHERE id = ?').run(totalRounds, id);
  }

  advanceRound(id: string, nextRound: number, status: TandaStatus): void {
    this.db.prepare('UPDATE tandas SET currentRound = ?, status = ? WHERE id = ?').run(nextRound, status, id);
  }
}
