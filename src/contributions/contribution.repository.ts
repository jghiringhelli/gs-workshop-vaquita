import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { IContributionRepository } from './contribution.repository.interface';
import { Contribution, ContributionRow, CreateContributionDTO } from './contribution.types';

/**
 * SQLite implementation of IContributionRepository.
 */
export class ContributionRepository implements IContributionRepository {
  /**
   * @param db - Open better-sqlite3 database connection
   */
  constructor(private readonly db: Database.Database) {}

  /**
   * Inserts a new contribution row and returns the created domain entity.
   * @param dto - Validated creation data
   */
  create(dto: CreateContributionDTO): Contribution {
    const id = uuidv4();
    this.db
      .prepare(
        'INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, dto.tandaId, dto.participantId, dto.round, dto.amount, dto.status);

    const created = this.db
      .prepare('SELECT * FROM contributions WHERE id = ?')
      .get(id) as ContributionRow | undefined;

    if (!created) throw new Error(`Failed to retrieve contribution after insert: ${id}`);
    return rowToContribution(created);
  }

  /**
   * Finds a contribution by participant + round combination.
   * Returns null if not found — used to detect duplicate contributions before INSERT.
   * @param participantId - Participant UUID
   * @param round - Round number
   */
  findByParticipantAndRound(participantId: string, round: number): Contribution | null {
    const row = this.db
      .prepare('SELECT * FROM contributions WHERE participant_id = ? AND round = ?')
      .get(participantId, round) as ContributionRow | undefined;
    return row ? rowToContribution(row) : null;
  }

  /**
   * Returns all contributions for a tanda in a specific round, ordered by creation date.
   * @param tandaId - Tanda UUID
   * @param round - Round number
   */
  findByTandaAndRound(tandaId: string, round: number): Contribution[] {
    const rows = this.db
      .prepare('SELECT * FROM contributions WHERE tanda_id = ? AND round = ? ORDER BY created_at ASC')
      .all(tandaId, round) as ContributionRow[];
    return rows.map(rowToContribution);
  }

  /**
   * Returns all contributions for a participant ordered by round ascending.
   * @param participantId - Participant UUID
   */
  findByParticipantId(participantId: string): Contribution[] {
    const rows = this.db
      .prepare('SELECT * FROM contributions WHERE participant_id = ? ORDER BY round ASC')
      .all(participantId) as ContributionRow[];
    return rows.map(rowToContribution);
  }
}

/**
 * Maps a raw database row to the domain Contribution entity.
 * @param row - Database row with snake_case columns
 */
function rowToContribution(row: ContributionRow): Contribution {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at,
  };
}
