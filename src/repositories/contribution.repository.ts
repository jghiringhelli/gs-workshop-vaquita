import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Contribution, ContributionStatus, RecordContributionDto } from '../tandas/types';

/** Contract for contribution persistence operations. */
export interface IContributionRepository {
  /**
   * Persists a new contribution record.
   * @param tandaId - Tanda UUID.
   * @param dto - Contribution data.
   * @param round - Round number.
   * @param status - Contribution status.
   * @returns Created Contribution entity.
   */
  create(
    tandaId: string,
    dto: RecordContributionDto,
    round: number,
    status: ContributionStatus,
  ): Contribution;

  /**
   * Returns all contributions for a tanda in a specific round.
   * @param tandaId - Tanda UUID.
   * @param round - Round number.
   * @returns Read-only array of Contribution entities.
   */
  findByTandaAndRound(tandaId: string, round: number): ReadonlyArray<Contribution>;

  /**
   * Returns full contribution history for a participant.
   * @param participantId - Participant UUID.
   * @returns Read-only array of Contribution entities.
   */
  findByParticipantId(participantId: string): ReadonlyArray<Contribution>;

  /**
   * Finds a participant's contribution for a specific round.
   * @param participantId - Participant UUID.
   * @param round - Round number.
   * @returns Contribution entity or null.
   */
  findByParticipantAndRound(participantId: string, round: number): Contribution | null;
}

interface ContributionRow {
  id: string;
  tanda_id: string;
  participant_id: string;
  round: number;
  amount: number;
  status: string;
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
    createdAt: row.created_at,
  };
}

/** SQLite-backed implementation of IContributionRepository. */
export class SqliteContributionRepository implements IContributionRepository {
  constructor(private readonly db: Database.Database) {}

  create(tandaId: string, dto: RecordContributionDto, round: number, status: ContributionStatus): Contribution {
    const id = uuidv4();
    this.db
      .prepare(
        'INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, tandaId, dto.participantId, round, dto.amount, status);
    const row = this.db.prepare('SELECT * FROM contributions WHERE id = ?').get(id) as ContributionRow;
    return rowToContribution(row);
  }

  findByTandaAndRound(tandaId: string, round: number): ReadonlyArray<Contribution> {
    const rows = this.db
      .prepare('SELECT * FROM contributions WHERE tanda_id = ? AND round = ? ORDER BY created_at ASC')
      .all(tandaId, round) as ContributionRow[];
    return rows.map(rowToContribution);
  }

  findByParticipantId(participantId: string): ReadonlyArray<Contribution> {
    const rows = this.db
      .prepare('SELECT * FROM contributions WHERE participant_id = ? ORDER BY round ASC, created_at ASC')
      .all(participantId) as ContributionRow[];
    return rows.map(rowToContribution);
  }

  findByParticipantAndRound(participantId: string, round: number): Contribution | null {
    const row = this.db
      .prepare('SELECT * FROM contributions WHERE participant_id = ? AND round = ?')
      .get(participantId, round) as ContributionRow | undefined;
    return row ? rowToContribution(row) : null;
  }
}
