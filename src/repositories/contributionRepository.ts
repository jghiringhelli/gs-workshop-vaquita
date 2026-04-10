import { getDb } from '../db/database';

export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

export interface Contribution {
  id: number;
  tandaId: number;
  participantId: number;
  round: number;
  amount: number;
  status: ContributionStatus;
  paidAt: string | null;
  createdAt: string;
}

export function recordContribution(
  tandaId: number,
  participantId: number,
  round: number,
  amount: number,
  status: ContributionStatus = 'paid'
): Contribution {
  const db = getDb();
  const paidAt = new Date().toISOString();
  return db
    .prepare<[number, number, number, number, string, string], Contribution>(
      `INSERT INTO contributions (tandaId, participantId, round, amount, status, paidAt)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`
    )
    .get(tandaId, participantId, round, amount, status, paidAt) as Contribution;
}

export function getContribution(
  tandaId: number,
  participantId: number,
  round: number
): Contribution | undefined {
  const db = getDb();
  return db
    .prepare<[number, number, number], Contribution>(
      'SELECT * FROM contributions WHERE tandaId = ? AND participantId = ? AND round = ?'
    )
    .get(tandaId, participantId, round);
}

export function listContributionsByRound(tandaId: number, round: number): Contribution[] {
  const db = getDb();
  return db
    .prepare<[number, number], Contribution>(
      'SELECT * FROM contributions WHERE tandaId = ? AND round = ? ORDER BY participantId'
    )
    .all(tandaId, round);
}

export function listContributionsByParticipant(participantId: number): Contribution[] {
  const db = getDb();
  return db
    .prepare<[number], Contribution>(
      'SELECT * FROM contributions WHERE participantId = ? ORDER BY round'
    )
    .all(participantId);
}

export function markMissedContributions(
  tandaId: number,
  participantIds: number[],
  round: number,
  expectedAmount: number
): void {
  const db = getDb();
  const stmt = db.prepare<[number, number, number, number]>(
    `INSERT OR IGNORE INTO contributions (tandaId, participantId, round, amount, status)
     VALUES (?, ?, ?, ?, 'missed')`
  );
  const tx = db.transaction(() => {
    for (const pid of participantIds) {
      stmt.run(tandaId, pid, round, expectedAmount);
    }
  });
  tx();
}
