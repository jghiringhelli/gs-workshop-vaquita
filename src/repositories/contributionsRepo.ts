import { v4 as uuidv4 } from 'uuid';
import type { DB } from '../db/db';

export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export function createContributionsRepo(db: DB) {
  return {
    findById(id: string): Contribution | undefined {
      return db.prepare('SELECT * FROM contributions WHERE id = ?').get(id) as Contribution | undefined;
    },

    findByParticipantAndRound(participantId: string, round: number): Contribution | undefined {
      return db.prepare(
        'SELECT * FROM contributions WHERE participantId = ? AND round = ?',
      ).get(participantId, round) as Contribution | undefined;
    },

    findByTandaAndRound(tandaId: string, round: number): Contribution[] {
      return db.prepare(
        'SELECT * FROM contributions WHERE tandaId = ? AND round = ? ORDER BY participantId ASC',
      ).all(tandaId, round) as Contribution[];
    },

    findByParticipant(participantId: string): Contribution[] {
      return db.prepare(
        'SELECT * FROM contributions WHERE participantId = ? ORDER BY round ASC',
      ).all(participantId) as Contribution[];
    },

    createMany(
      items: Array<{
        tandaId: string;
        participantId: string;
        round: number;
        amount: number;
        dueAt?: string;
      }>,
    ): void {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO contributions (id, tandaId, participantId, round, amount, status, dueAt, paidAt, createdAt)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL, ?)
      `);
      db.transaction(() => {
        for (const item of items) {
          stmt.run(
            uuidv4(), item.tandaId, item.participantId, item.round,
            item.amount, item.dueAt ?? null, new Date().toISOString(),
          );
        }
      })();
    },

    create(data: {
      tandaId: string;
      participantId: string;
      round: number;
      amount: number;
      dueAt?: string;
    }): Contribution {
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO contributions (id, tandaId, participantId, round, amount, status, dueAt, paidAt, createdAt)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL, ?)
      `).run(id, data.tandaId, data.participantId, data.round, data.amount, data.dueAt ?? null, now);
      return this.findById(id)!;
    },

    updateStatus(id: string, status: ContributionStatus, amount?: number, paidAt?: string): void {
      if (amount !== undefined && paidAt !== undefined) {
        db.prepare('UPDATE contributions SET status = ?, amount = ?, paidAt = ? WHERE id = ?')
          .run(status, amount, paidAt, id);
      } else {
        db.prepare('UPDATE contributions SET status = ? WHERE id = ?').run(status, id);
      }
    },

    /** Mark all 'pending' contributions for a tanda/round as 'missed'. */
    updatePendingToMissed(tandaId: string, round: number): void {
      db.prepare(`
        UPDATE contributions SET status = 'missed'
        WHERE tandaId = ? AND round = ? AND status = 'pending'
      `).run(tandaId, round);
    },
  };
}

export type ContributionsRepo = ReturnType<typeof createContributionsRepo>;
