import Database from 'better-sqlite3';
import { Contribution, ContributionStatus } from '../models';
import { IContributionRepository } from './interfaces';

type ContributionRow = {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: string;
  createdAt: string;
};

function rowToContribution(row: ContributionRow): Contribution {
  return { ...row, status: row.status as ContributionStatus };
}

export class ContributionRepository implements IContributionRepository {
  constructor(private readonly db: Database.Database) {}

  create(data: Omit<Contribution, 'createdAt'>): Contribution {
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO contributions (id, tandaId, participantId, round, amount, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(data.id, data.tandaId, data.participantId, data.round, data.amount, data.status, createdAt);
    return { ...data, createdAt };
  }

  findByTandaAndRound(tandaId: string, round: number): Contribution[] {
    const rows = this.db
      .prepare('SELECT * FROM contributions WHERE tandaId = ? AND round = ? ORDER BY createdAt ASC')
      .all(tandaId, round) as ContributionRow[];
    return rows.map(rowToContribution);
  }

  findByParticipant(participantId: string): Contribution[] {
    const rows = this.db
      .prepare('SELECT * FROM contributions WHERE participantId = ? ORDER BY round ASC')
      .all(participantId) as ContributionRow[];
    return rows.map(rowToContribution);
  }

  findByParticipantAndRound(participantId: string, round: number): Contribution | null {
    const row = this.db
      .prepare('SELECT * FROM contributions WHERE participantId = ? AND round = ?')
      .get(participantId, round) as ContributionRow | undefined;
    return row ? rowToContribution(row) : null;
  }
}
