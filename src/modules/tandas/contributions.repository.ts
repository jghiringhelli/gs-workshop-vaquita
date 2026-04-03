import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

export interface ContributionRow {
  id: string;
  tanda_id: string;
  participant_id: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  penalty_amount: number;
  created_at: string;
}

export interface CreateContributionInput {
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  penaltyAmount: number;
}

/**
 * Repository: all SQLite access for the contributions table.
 */
export const createContributionsRepository = (db: Database.Database) => ({
  insert(input: CreateContributionInput): ContributionRow {
    const row: ContributionRow = {
      id: uuidv4(),
      tanda_id: input.tandaId,
      participant_id: input.participantId,
      round: input.round,
      amount: input.amount,
      status: input.status,
      penalty_amount: input.penaltyAmount,
      created_at: new Date().toISOString(),
    };
    db.prepare(`
      INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status, penalty_amount, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(row.id, row.tanda_id, row.participant_id, row.round, row.amount, row.status, row.penalty_amount, row.created_at);
    return row;
  },

  findByTandaAndRound(tandaId: string, round: number): ContributionRow[] {
    return db.prepare('SELECT * FROM contributions WHERE tanda_id = ? AND round = ?').all(tandaId, round) as ContributionRow[];
  },

  findByParticipant(participantId: string): ContributionRow[] {
    return db.prepare('SELECT * FROM contributions WHERE participant_id = ? ORDER BY round ASC').all(participantId) as ContributionRow[];
  },

  findByParticipantAndRound(participantId: string, round: number): ContributionRow | undefined {
    return db.prepare('SELECT * FROM contributions WHERE participant_id = ? AND round = ?').get(participantId, round) as ContributionRow | undefined;
  },

  /** Bulk-insert missed contributions for participants who did not contribute in a round. */
  insertMissed(tandaId: string, participantIds: string[], round: number, expectedAmount: number): void {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO contributions (id, tanda_id, participant_id, round, amount, status, penalty_amount, created_at)
      VALUES (?, ?, ?, ?, ?, 'missed', 0, ?)
    `);
    const runAll = db.transaction(() => {
      const now = new Date().toISOString();
      for (const pid of participantIds) {
        stmt.run(uuidv4(), tandaId, pid, round, expectedAmount, now);
      }
    });
    runAll();
  },
});

export type ContributionsRepository = ReturnType<typeof createContributionsRepository>;
