import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Participant, ParticipantRole } from '../tandas/types';

/** Contract for participant persistence operations. */
export interface IParticipantRepository {
  /**
   * Adds a user to a tanda.
   * @param userId - User UUID.
   * @param tandaId - Tanda UUID.
   * @param role - Participant role.
   * @returns Created Participant entity.
   */
  create(userId: string, tandaId: string, role: ParticipantRole): Participant;

  /**
   * Finds a participant by primary key.
   * @param id - Participant UUID.
   * @returns Participant entity or null.
   */
  findById(id: string): Participant | null;

  /**
   * Returns all participants in a tanda, ordered by rotation position then creation date.
   * @param tandaId - Tanda UUID.
   * @returns Read-only array of Participant entities.
   */
  findByTandaId(tandaId: string): ReadonlyArray<Participant>;

  /**
   * Finds the participant record for a user in a specific tanda.
   * @param userId - User UUID.
   * @param tandaId - Tanda UUID.
   * @returns Participant entity or null.
   */
  findByUserIdAndTandaId(userId: string, tandaId: string): Participant | null;

  /**
   * Counts participants in a tanda.
   * @param tandaId - Tanda UUID.
   * @returns Number of participants.
   */
  countByTandaId(tandaId: string): number;

  /**
   * Assigns rotation positions to participants in bulk.
   * @param tandaId - Tanda UUID.
   * @param positions - Array of {id, position} pairs.
   */
  assignRotationPositions(tandaId: string, positions: ReadonlyArray<{ id: string; position: number }>): void;

  /**
   * Increments the consecutive missed counter for a participant.
   * @param id - Participant UUID.
   */
  incrementConsecutiveMissed(id: string): void;

  /**
   * Resets the consecutive missed counter to zero.
   * @param id - Participant UUID.
   */
  resetConsecutiveMissed(id: string): void;

  /**
   * Flags a participant as a defaulter.
   * @param id - Participant UUID.
   */
  markAsDefaulter(id: string): void;
}

interface ParticipantRow {
  id: string;
  user_id: string;
  tanda_id: string;
  role: string;
  rotation_position: number | null;
  consecutive_missed: number;
  is_defaulter: number;
  created_at: string;
}

function rowToParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role as ParticipantRole,
    rotationPosition: row.rotation_position,
    consecutiveMissed: row.consecutive_missed,
    isDefaulter: row.is_defaulter === 1,
    createdAt: row.created_at,
  };
}

/** SQLite-backed implementation of IParticipantRepository. */
export class SqliteParticipantRepository implements IParticipantRepository {
  constructor(private readonly db: Database.Database) {}

  create(userId: string, tandaId: string, role: ParticipantRole): Participant {
    const id = uuidv4();
    this.db
      .prepare('INSERT INTO participants (id, user_id, tanda_id, role) VALUES (?, ?, ?, ?)')
      .run(id, userId, tandaId, role);
    return this.findById(id) as Participant;
  }

  findById(id: string): Participant | null {
    const row = this.db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as ParticipantRow | undefined;
    return row ? rowToParticipant(row) : null;
  }

  findByTandaId(tandaId: string): ReadonlyArray<Participant> {
    const rows = this.db
      .prepare('SELECT * FROM participants WHERE tanda_id = ? ORDER BY rotation_position ASC, created_at ASC')
      .all(tandaId) as ParticipantRow[];
    return rows.map(rowToParticipant);
  }

  findByUserIdAndTandaId(userId: string, tandaId: string): Participant | null {
    const row = this.db
      .prepare('SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?')
      .get(userId, tandaId) as ParticipantRow | undefined;
    return row ? rowToParticipant(row) : null;
  }

  countByTandaId(tandaId: string): number {
    const result = this.db
      .prepare('SELECT COUNT(*) as count FROM participants WHERE tanda_id = ?')
      .get(tandaId) as { count: number };
    return result.count;
  }

  assignRotationPositions(tandaId: string, positions: ReadonlyArray<{ id: string; position: number }>): void {
    const stmt = this.db.prepare('UPDATE participants SET rotation_position = ? WHERE id = ?');
    const runAll = this.db.transaction(() => {
      for (const { id, position } of positions) {
        stmt.run(position, id);
      }
    });
    runAll();
  }

  incrementConsecutiveMissed(id: string): void {
    this.db.prepare('UPDATE participants SET consecutive_missed = consecutive_missed + 1 WHERE id = ?').run(id);
  }

  resetConsecutiveMissed(id: string): void {
    this.db.prepare('UPDATE participants SET consecutive_missed = 0 WHERE id = ?').run(id);
  }

  markAsDefaulter(id: string): void {
    this.db.prepare('UPDATE participants SET is_defaulter = 1 WHERE id = ?').run(id);
  }
}
