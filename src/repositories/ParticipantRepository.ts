import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import type { Participant, ParticipantRole } from '../domain/types.js';
import type { IParticipantRepository } from '../domain/interfaces.js';

interface ParticipantRow {
  id: string;
  user_id: string;
  tanda_id: string;
  role: string;
  rotation_position: number | null;
}

function mapRow(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role as ParticipantRole,
    rotationPosition: row.rotation_position,
  };
}

/** SQLite-backed implementation of IParticipantRepository. */
export class ParticipantRepository implements IParticipantRepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Insert a new participant row.
   * @param data - userId, tandaId, and role
   * @returns The created Participant record
   */
  create(data: { userId: string; tandaId: string; role: ParticipantRole }): Participant {
    const id = uuid();
    this.db
      .prepare(
        'INSERT INTO participants (id, user_id, tanda_id, role) VALUES (?, ?, ?, ?)',
      )
      .run(id, data.userId, data.tandaId, data.role);
    const row = this.db
      .prepare('SELECT * FROM participants WHERE id = ?')
      .get(id) as ParticipantRow;
    return mapRow(row);
  }

  /**
   * Look up a participant by primary key.
   * @param id - UUID of the participant
   * @returns Participant if found, undefined otherwise
   */
  findById(id: string): Participant | undefined {
    const row = this.db
      .prepare('SELECT * FROM participants WHERE id = ?')
      .get(id) as ParticipantRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  /**
   * Return all participants for a given tanda.
   * @param tandaId - UUID of the tanda
   * @returns Array of Participant records
   */
  findByTandaId(tandaId: string): Participant[] {
    const rows = this.db
      .prepare('SELECT * FROM participants WHERE tanda_id = ?')
      .all(tandaId) as ParticipantRow[];
    return rows.map(mapRow);
  }

  /**
   * Find the participant matching a (userId, tandaId) pair.
   * @param userId - UUID of the user
   * @param tandaId - UUID of the tanda
   * @returns Participant if found, undefined otherwise
   */
  findByUserAndTanda(userId: string, tandaId: string): Participant | undefined {
    const row = this.db
      .prepare(
        'SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?',
      )
      .get(userId, tandaId) as ParticipantRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  /**
   * Set the rotation_position for a participant.
   * @param id - UUID of the participant
   * @param position - 1-based rotation position
   */
  updateRotationPosition(id: string, position: number): void {
    this.db
      .prepare('UPDATE participants SET rotation_position = ? WHERE id = ?')
      .run(position, id);
  }

  /**
   * Count how many participants are in a tanda.
   * @param tandaId - UUID of the tanda
   * @returns Number of participants
   */
  countByTandaId(tandaId: string): number {
    const result = this.db
      .prepare('SELECT COUNT(*) as count FROM participants WHERE tanda_id = ?')
      .get(tandaId) as { count: number };
    return result.count;
  }
}
