import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import type { Contribution, ContributionStatus } from '../domain/types.js';
import type { IContributionRepository } from '../domain/interfaces.js';

interface ContributionRow {
  id: string;
  tanda_id: string;
  participant_id: string;
  round: number;
  amount: number;
  status: string;
}

function mapRow(row: ContributionRow): Contribution {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    amount: row.amount,
    status: row.status as ContributionStatus,
  };
}

/** SQLite-backed implementation of IContributionRepository. */
export class ContributionRepository implements IContributionRepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Insert a new contribution record.
   * @param data - tandaId, participantId, round, amount, and status
   * @returns The created Contribution record
   */
  create(data: {
    tandaId: string;
    participantId: string;
    round: number;
    amount: number;
    status: ContributionStatus;
  }): Contribution {
    const id = uuid();
    this.db
      .prepare(
        `INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, data.tandaId, data.participantId, data.round, data.amount, data.status);
    const row = this.db
      .prepare('SELECT * FROM contributions WHERE id = ?')
      .get(id) as ContributionRow;
    return mapRow(row);
  }

  /**
   * Find the contribution for a participant in a specific round.
   * @param participantId - UUID of the participant
   * @param round - Round number
   * @returns Contribution if found, undefined otherwise
   */
  findByParticipantAndRound(participantId: string, round: number): Contribution | undefined {
    const row = this.db
      .prepare(
        'SELECT * FROM contributions WHERE participant_id = ? AND round = ?',
      )
      .get(participantId, round) as ContributionRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  /**
   * Return all contributions recorded for a tanda in a given round.
   * @param tandaId - UUID of the tanda
   * @param round - Round number
   * @returns Array of Contribution records
   */
  findByTandaAndRound(tandaId: string, round: number): Contribution[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM contributions WHERE tanda_id = ? AND round = ?',
      )
      .all(tandaId, round) as ContributionRow[];
    return rows.map(mapRow);
  }

  /**
   * Return all contributions for a participant, ordered by round ascending.
   * @param participantId - UUID of the participant
   * @returns Array of Contribution records
   */
  findByParticipantId(participantId: string): Contribution[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM contributions WHERE participant_id = ? ORDER BY round ASC',
      )
      .all(participantId) as ContributionRow[];
    return rows.map(mapRow);
  }
}
