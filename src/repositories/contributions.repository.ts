import { getDb } from '../db';
import type { Contribution, ContributionStatus } from '../types';

export function createContribution(
  tandaId: number,
  participantId: number,
  round: number,
  amount: number,
  status: ContributionStatus,
): Contribution {
  return getDb()
    .prepare<[number, number, number, number, ContributionStatus], Contribution>(
      'INSERT INTO contributions (tandaId, participantId, round, amount, status) VALUES (?, ?, ?, ?, ?) RETURNING *',
    )
    .get(tandaId, participantId, round, amount, status) as Contribution;
}

export function findContribution(
  participantId: number,
  round: number,
): Contribution | undefined {
  return getDb()
    .prepare<[number, number], Contribution>(
      'SELECT * FROM contributions WHERE participantId = ? AND round = ?',
    )
    .get(participantId, round);
}

export function listContributionsForRound(
  tandaId: number,
  round: number,
): Contribution[] {
  return getDb()
    .prepare<[number, number], Contribution>(
      'SELECT * FROM contributions WHERE tandaId = ? AND round = ? ORDER BY participantId',
    )
    .all(tandaId, round);
}

export function listContributionsForParticipant(
  participantId: number,
): Contribution[] {
  return getDb()
    .prepare<[number], Contribution>(
      'SELECT * FROM contributions WHERE participantId = ? ORDER BY round',
    )
    .all(participantId);
}

export function getConsecutiveMissedCount(participantId: number, beforeRound: number): number {
  const rows = getDb()
    .prepare<[number, number], { status: ContributionStatus }>(
      `SELECT status FROM contributions
       WHERE participantId = ? AND round < ?
       ORDER BY round DESC
       LIMIT 2`,
    )
    .all(participantId, beforeRound);
  return rows.filter((r) => r.status === 'missed').length;
}
