import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { IParticipantRepository } from './participant.repository.interface';
import { Participant, ParticipantRow, CreateParticipantDTO } from './participant.types';

/**
 * SQLite implementation of IParticipantRepository.
 */
export class ParticipantRepository implements IParticipantRepository {
  /**
   * @param db - Open better-sqlite3 database connection
   */
  constructor(private readonly db: Database.Database) {}

  /**
   * Inserts a new participant row and returns the created domain entity.
   * @param dto - Validated creation data
   */
  create(dto: CreateParticipantDTO): Participant {
    const id = uuidv4();
    this.db
      .prepare(
        'INSERT INTO participants (id, user_id, tanda_id, role, rotation_position) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, dto.userId, dto.tandaId, dto.role, dto.rotationPosition ?? null);

    const created = this.db
      .prepare('SELECT * FROM participants WHERE id = ?')
      .get(id) as ParticipantRow | undefined;

    if (!created) throw new Error(`Failed to retrieve participant after insert: ${id}`);
    return rowToParticipant(created);
  }

  /**
   * Returns all participants for a given tanda, ordered by creation date ascending.
   * Used for listing and for counting against the max-participant limit.
   * @param tandaId - Tanda UUID
   */
  findByTandaId(tandaId: string): Participant[] {
    const rows = this.db
      .prepare('SELECT * FROM participants WHERE tanda_id = ? ORDER BY created_at ASC')
      .all(tandaId) as ParticipantRow[];
    return rows.map(rowToParticipant);
  }

  /**
   * Finds a participant by tanda + user combination.
   * Returns null if the user is not in that tanda — used for duplicate-join detection.
   * @param tandaId - Tanda UUID
   * @param userId - User UUID
   */
  findByTandaAndUser(tandaId: string, userId: string): Participant | null {
    const row = this.db
      .prepare('SELECT * FROM participants WHERE tanda_id = ? AND user_id = ?')
      .get(tandaId, userId) as ParticipantRow | undefined;
    return row ? rowToParticipant(row) : null;
  }
}

/**
 * Maps a raw database row to the domain Participant entity.
 * @param row - Database row with snake_case columns
 */
function rowToParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role,
    rotationPosition: row.rotation_position,
    createdAt: row.created_at,
  };
}
