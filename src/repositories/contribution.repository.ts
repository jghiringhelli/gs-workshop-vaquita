import { getDb } from '../db/database';

export interface ContributionRow {
  id: number;
  tanda_id: number;
  participant_id: number;
  round: number;
  amount: number;
  status: string;
}

export function createContribution(
  tandaId: number,
  participantId: number,
  round: number,
  amount: number,
  status: string
): ContributionRow {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO contributions (tanda_id, participant_id, round, amount, status) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(tandaId, participantId, round, amount, status);
  return {
    id: Number(result.lastInsertRowid),
    tanda_id: tandaId,
    participant_id: participantId,
    round,
    amount,
    status,
  };
}

export function findContributionsByTandaAndRound(tandaId: number, round: number): ContributionRow[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM contributions WHERE tanda_id = ? AND round = ?');
  return stmt.all(tandaId, round) as ContributionRow[];
}

export function findContributionsByParticipantId(participantId: number): ContributionRow[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM contributions WHERE participant_id = ? ORDER BY round ASC');
  return stmt.all(participantId) as ContributionRow[];
}

export function findContributionByParticipantAndRound(
  participantId: number,
  round: number
): ContributionRow | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM contributions WHERE participant_id = ? AND round = ?');
  return stmt.get(participantId, round) as ContributionRow | undefined;
}
