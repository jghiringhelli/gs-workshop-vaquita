import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';

export interface ContributionRow {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: string;
  isDefaulter: number;
}

export function createContribution(
  data: {
    tandaId: string;
    participantId: string;
    round: number;
    amount: number;
    status: string;
  },
  db: Database.Database = getDb(),
): ContributionRow {
  const id = uuidv4();
  db.prepare(
    'INSERT INTO contributions (id, tandaId, participantId, round, amount, status, isDefaulter) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, data.tandaId, data.participantId, data.round, data.amount, data.status, 0);
  return {
    id,
    tandaId: data.tandaId,
    participantId: data.participantId,
    round: data.round,
    amount: data.amount,
    status: data.status,
    isDefaulter: 0,
  };
}

export function findContributionsByRound(
  tandaId: string,
  round: number,
  db: Database.Database = getDb(),
): ContributionRow[] {
  return db
    .prepare('SELECT * FROM contributions WHERE tandaId = ? AND round = ?')
    .all(tandaId, round) as ContributionRow[];
}

export function findContributionsByParticipant(
  participantId: string,
  db: Database.Database = getDb(),
): ContributionRow[] {
  return db
    .prepare('SELECT * FROM contributions WHERE participantId = ?')
    .all(participantId) as ContributionRow[];
}

export function findContributionByParticipantAndRound(
  participantId: string,
  round: number,
  db: Database.Database = getDb(),
): ContributionRow | undefined {
  return db
    .prepare('SELECT * FROM contributions WHERE participantId = ? AND round = ?')
    .get(participantId, round) as ContributionRow | undefined;
}

export function updateContributionDefaulter(
  id: string,
  isDefaulter: number,
  db: Database.Database = getDb(),
): void {
  db.prepare('UPDATE contributions SET isDefaulter = ? WHERE id = ?').run(isDefaulter, id);
}

export function findContributionsByParticipantOrderedByRound(
  participantId: string,
  db: Database.Database = getDb(),
): ContributionRow[] {
  return db
    .prepare('SELECT * FROM contributions WHERE participantId = ? ORDER BY round ASC')
    .all(participantId) as ContributionRow[];
}
