import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface Tanda {
  id: string;
  name: string;
  organizer_id: string;
  contribution_amount: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  current_round: number;
  total_rounds: number;
}

export const tandaRepository = {
  create(name: string, organizerId: string, contributionAmount: number): Tanda {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO tandas (id, name, organizer_id, contribution_amount, status, current_round, total_rounds)
       VALUES (?, ?, ?, ?, 'forming', 0, 0)`,
    ).run(id, name, organizerId, contributionAmount);
    return this.findById(id)!;
  },

  findById(id: string): Tanda | undefined {
    return db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as Tanda | undefined;
  },

  findByOrganizer(organizerId: string): Tanda[] {
    return db.prepare('SELECT * FROM tandas WHERE organizer_id = ?').all(organizerId) as Tanda[];
  },

  findByUserId(userId: string): Tanda[] {
    return db.prepare(
      `SELECT t.* FROM tandas t
       JOIN participants p ON p.tanda_id = t.id
       WHERE p.user_id = ?`,
    ).all(userId) as Tanda[];
  },

  findAll(): Tanda[] {
    return db.prepare('SELECT * FROM tandas').all() as Tanda[];
  },

  updateStatus(id: string, status: Tanda['status']): void {
    db.prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
  },

  updateRound(id: string, currentRound: number): void {
    db.prepare('UPDATE tandas SET current_round = ? WHERE id = ?').run(currentRound, id);
  },

  setTotalRounds(id: string, totalRounds: number): void {
    db.prepare('UPDATE tandas SET total_rounds = ? WHERE id = ?').run(totalRounds, id);
  },
};
