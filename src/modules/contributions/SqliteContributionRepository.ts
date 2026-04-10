import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Contribution, ContributionStatus, CreateContributionDto } from './Contribution';
import { IContributionRepository } from './IContributionRepository';

interface ContributionRow {
  id: string;
  tanda_id: string;
  participant_id: string;
  round: number;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

function rowToContribution(row: ContributionRow): Contribution {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    amount: row.amount,
    status: row.status as ContributionStatus,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

export class SqliteContributionRepository implements IContributionRepository {
  constructor(private readonly db: Database.Database) {}

  create(dto: CreateContributionDto): Contribution {
    const c: Contribution = {
      id: uuidv4(),
      tandaId: dto.tandaId,
      participantId: dto.participantId,
      round: dto.round,
      amount: dto.amount,
      status: dto.status ?? 'paid',
      paidAt: dto.paidAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.db
      .prepare(
        'INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(c.id, c.tandaId, c.participantId, c.round, c.amount, c.status, c.paidAt, c.createdAt);
    return c;
  }

  findByTandaAndRound(tandaId: string, round: number): Contribution[] {
    const rows = this.db
      .prepare('SELECT * FROM contributions WHERE tanda_id = ? AND round = ?')
      .all(tandaId, round) as ContributionRow[];
    return rows.map(rowToContribution);
  }

  findByParticipantId(participantId: string): Contribution[] {
    const rows = this.db
      .prepare('SELECT * FROM contributions WHERE participant_id = ? ORDER BY round ASC')
      .all(participantId) as ContributionRow[];
    return rows.map(rowToContribution);
  }

  findByParticipantAndRound(participantId: string, round: number): Contribution | null {
    const row = this.db
      .prepare('SELECT * FROM contributions WHERE participant_id = ? AND round = ?')
      .get(participantId, round) as ContributionRow | undefined;
    return row ? rowToContribution(row) : null;
  }

  markMissed(tandaId: string, round: number, participantIds: string[]): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO contributions (id, tanda_id, participant_id, round, amount, status, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    const markAll = this.db.transaction(() => {
      for (const pid of participantIds) {
        stmt.run(uuidv4(), tandaId, pid, round, 0, 'missed', null, now);
      }
    });
    markAll();
  }

  getConsecutiveMisses(participantId: string): number {
    const rows = this.db
      .prepare('SELECT status FROM contributions WHERE participant_id = ? ORDER BY round DESC')
      .all(participantId) as Array<{ status: string }>;
    let count = 0;
    for (const row of rows) {
      if (row.status === 'missed') count++;
      else break;
    }
    return count;
  }
}
