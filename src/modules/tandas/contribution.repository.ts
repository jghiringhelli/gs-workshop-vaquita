import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Contribution, ContributionStatus } from './tanda.entity.js';
import { IContributionRepository } from './tanda.port.js';

interface ContributionRow {
  id: string;
  tanda_id: string;
  participant_id: string;
  round: number;
  amount: number;
  status: string;
}

function rowToContribution(row: ContributionRow): Contribution {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    amount: row.amount,
    status: row.status as ContributionStatus,
  };
}

/** SQLite implementation of IContributionRepository */
export class ContributionRepository implements IContributionRepository {
  /** @param db - The shared SQLite connection */
  constructor(private readonly db: Database.Database) {}

  /**
   * Persists a new contribution.
   * @param data - Contribution fields excluding the generated id
   * @returns The created Contribution with id
   */
  create(data: Omit<Contribution, 'id'>): Contribution {
    const id = uuidv4();
    this.db
      .prepare(
        `INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, data.tandaId, data.participantId, data.round, data.amount, data.status);
    return { id, ...data };
  }

  /**
   * Lists all contributions for a tanda in a specific round.
   * @param tandaId - UUID of the tanda
   * @param round   - Round number (1-based)
   * @returns Array of Contribution records
   */
  findByTandaAndRound(tandaId: string, round: number): Contribution[] {
    const rows = this.db
      .prepare('SELECT * FROM contributions WHERE tanda_id = ? AND round = ?')
      .all(tandaId, round) as ContributionRow[];
    return rows.map(rowToContribution);
  }

  /**
   * Lists all contributions made by a participant.
   * @param participantId - UUID of the participant
   * @returns Array of Contribution records ordered by round
   */
  findByParticipant(participantId: string): Contribution[] {
    const rows = this.db
      .prepare('SELECT * FROM contributions WHERE participant_id = ? ORDER BY round ASC')
      .all(participantId) as ContributionRow[];
    return rows.map(rowToContribution);
  }

  /**
   * Finds a specific contribution by participant and round.
   * @param participantId - UUID of the participant
   * @param round         - Round number
   * @returns The Contribution or null if not found
   */
  findByParticipantAndRound(participantId: string, round: number): Contribution | null {
    const row = this.db
      .prepare('SELECT * FROM contributions WHERE participant_id = ? AND round = ?')
      .get(participantId, round) as ContributionRow | undefined;
    return row ? rowToContribution(row) : null;
  }

  /**
   * Updates the status of a contribution.
   * @param id     - UUID of the contribution
   * @param status - New status
   * @returns The updated Contribution
   */
  updateStatus(id: string, status: Contribution['status']): Contribution {
    this.db.prepare('UPDATE contributions SET status = ? WHERE id = ?').run(status, id);
    const row = this.db
      .prepare('SELECT * FROM contributions WHERE id = ?')
      .get(id) as ContributionRow;
    return rowToContribution(row);
  }
}

