import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
}

export class ContributionRepository {
  constructor(private db: Database.Database) {}

  findByTandaAndRound(tandaId: string, round: number): Contribution[] {
    return this.db.prepare('SELECT * FROM contributions WHERE tandaId = ? AND round = ?').all(tandaId, round) as Contribution[];
  }

  findByParticipantAndRound(participantId: string, round: number): Contribution | undefined {
    return this.db.prepare('SELECT * FROM contributions WHERE participantId = ? AND round = ?').get(participantId, round) as Contribution | undefined;
  }

  findByParticipant(participantId: string): Contribution[] {
    return this.db.prepare('SELECT * FROM contributions WHERE participantId = ? ORDER BY round').all(participantId) as Contribution[];
  }

  create(data: { tandaId: string; participantId: string; round: number; amount: number; status: Contribution['status'] }): Contribution {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO contributions (id, tandaId, participantId, round, amount, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.tandaId, data.participantId, data.round, data.amount, data.status);
    return { id, ...data };
  }

  updateStatus(id: string, status: Contribution['status']): void {
    this.db.prepare('UPDATE contributions SET status = ? WHERE id = ?').run(status, id);
  }

  getConsecutiveMissedCount(participantId: string, upToRound: number): number {
    const contributions = this.db.prepare(`
      SELECT round, status FROM contributions
      WHERE participantId = ? AND round <= ?
      ORDER BY round DESC
    `).all(participantId, upToRound) as { round: number; status: string }[];

    let count = 0;
    for (const c of contributions) {
      if (c.status === 'missed') {
        count++;
      } else {
        break;
      }
    }
    return count;
  }
}
