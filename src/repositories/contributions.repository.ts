import { Contribution, ContributionStatus } from '../types';

interface ContributionRow {
  id: number;
  tanda_id: number;
  participant_id: number;
  round: number;
  amount: number;
  status: ContributionStatus;
}

function rowToContribution(row: ContributionRow): Contribution {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    amount: row.amount,
    status: row.status,
  };
}

export function createContribution(
  tandaId: number,
  participantId: number,
  round: number,
  amount: number,
  status: ContributionStatus
): Contribution {
  const stmt = db.prepare(
    'INSERT INTO contributions (tanda_id, participant_id, round, amount, status) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(tandaId, participantId, round, amount, status);
  return {
    id: result.lastInsertRowid as number,
    tandaId,
    participantId,
    round,
    amount,
    status,
  };
}

export function findContributionByParticipantAndRound(
  participantId: number,
  round: number
): Contribution | undefined {
  const row = db.prepare(
    'SELECT * FROM contributions WHERE participant_id = ? AND round = ?'
  ).get(participantId, round) as ContributionRow | undefined;
  return row ? rowToContribution(row) : undefined;
}

export function findContributionsByRound(tandaId: number, round: number): Contribution[] {
  const rows = db.prepare(
    'SELECT * FROM contributions WHERE tanda_id = ? AND round = ?'
  ).all(tandaId, round) as ContributionRow[];
  return rows.map(rowToContribution);
}

export function findContributionsByParticipant(participantId: number): Contribution[] {
  const rows = db.prepare(
    'SELECT * FROM contributions WHERE participant_id = ? ORDER BY round ASC'
  ).all(participantId) as ContributionRow[];
  return rows.map(rowToContribution);
}

export function updateContributionStatus(id: number, status: ContributionStatus): void {
  db.prepare('UPDATE contributions SET status = ? WHERE id = ?').run(status, id);
}
