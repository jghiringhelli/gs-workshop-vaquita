import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Participant, ParticipantRole } from './tanda.entity.js';
import { IParticipantRepository } from './tanda.port.js';

interface ParticipantRow {
  id: string;
  user_id: string;
  tanda_id: string;
  role: string;
  rotation_position: number | null;
}

/** Maps a DB row to a Participant entity */
function rowToParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role as ParticipantRole,
    rotationPosition: row.rotation_position,
  };
}

/** SQLite implementation of IParticipantRepository */
export class ParticipantRepository implements IParticipantRepository {
  /** @param db - The shared SQLite connection */
  constructor(private readonly db: Database.Database) {}

  /**
   * Persists a new participant.
   * @param data - Participant fields excluding the generated id
   * @returns The created Participant with id
   */
  create(data: Omit<Participant, 'id'>): Participant {
    const id = uuidv4();
    this.db
      .prepare(
        `INSERT INTO participants (id, user_id, tanda_id, role, rotation_position)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(id, data.userId, data.tandaId, data.role, data.rotationPosition ?? null);
    return { id, ...data };
  }

  /**
   * Lists all participants for a tanda.
   * @param tandaId - UUID of the tanda
   * @returns Array of Participant records
   */
  findByTandaId(tandaId: string): Participant[] {
    const rows = this.db
      .prepare('SELECT * FROM participants WHERE tanda_id = ? ORDER BY rotation_position ASC, id ASC')
      .all(tandaId) as ParticipantRow[];
    return rows.map(rowToParticipant);
  }

  /**
   * Finds the participation record for a given user in a given tanda.
   * @param userId  - UUID of the user
   * @param tandaId - UUID of the tanda
   * @returns The Participant or null if not a member
   */
  findByUserAndTanda(userId: string, tandaId: string): Participant | null {
    const row = this.db
      .prepare('SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?')
      .get(userId, tandaId) as ParticipantRow | undefined;
    return row ? rowToParticipant(row) : null;
  }

  /**
   * Bulk-assigns rotation positions to participants.
   * @param assignments - Array of { id, rotationPosition } pairs
   */
  assignPositions(assignments: Array<{ id: string; rotationPosition: number }>): void {
    const stmt = this.db.prepare('UPDATE participants SET rotation_position = ? WHERE id = ?');
    const bulk = this.db.transaction((items: typeof assignments) => {
      for (const item of items) {
        stmt.run(item.rotationPosition, item.id);
      }
    });
    bulk(assignments);
  }
}

