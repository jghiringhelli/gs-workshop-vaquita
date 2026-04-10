import type Database from 'better-sqlite3';
import type { Contribution, ContributionStatus } from '../types';

export function createContributionsRepository(db: Database.Database) {
  return {
    findByTandaAndRound(tandaId: number, round: number): Contribution[] {
      return db.prepare(
        'SELECT * FROM contributions WHERE tanda_id = ? AND round = ?'
      ).all(tandaId, round) as Contribution[];
    },
    findByParticipant(participantId: number): Contribution[] {
      return db.prepare(
        'SELECT * FROM contributions WHERE participant_id = ? ORDER BY round'
      ).all(participantId) as Contribution[];
    },
    findByTandaParticipantRound(
      tandaId: number,
      participantId: number,
      round: number
    ): Contribution | undefined {
      return db.prepare(
        'SELECT * FROM contributions WHERE tanda_id = ? AND participant_id = ? AND round = ?'
      ).get(tandaId, participantId, round) as Contribution | undefined;
    },
    create(
      tandaId: number,
      participantId: number,
      round: number,
      amount: number,
      status: ContributionStatus
    ): Contribution {
      return db.prepare(`
        INSERT INTO contributions (tanda_id, participant_id, round, amount, status)
        VALUES (?, ?, ?, ?, ?) RETURNING *
      `).get(tandaId, participantId, round, amount, status) as Contribution;
    },
  };
}

export type ContributionsRepository = ReturnType<typeof createContributionsRepository>;
