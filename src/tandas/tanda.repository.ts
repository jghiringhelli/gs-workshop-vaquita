import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { ITandaRepository } from './tanda.repository.interface';
import { Tanda, TandaRow, CreateTandaDTO } from './tanda.types';

/**
 * SQLite implementation of ITandaRepository.
 */
export class TandaRepository implements ITandaRepository {
  /**
   * @param db - Open better-sqlite3 database connection
   */
  constructor(private readonly db: Database.Database) {}

  /**
   * Inserts a new tanda row and returns the created domain entity.
   * Initial status is 'forming'; total_rounds starts at 0 until the tanda is started.
   * @param dto - Validated creation data
   */
  create(dto: CreateTandaDTO): Tanda {
    const id = uuidv4();
    this.db
      .prepare(
        `INSERT INTO tandas (id, name, organizer_id, contribution_amount)
         VALUES (?, ?, ?, ?)`,
      )
      .run(id, dto.name, dto.organizerId, dto.contributionAmount);

    const created = this.findById(id);
    if (!created) throw new Error(`Failed to retrieve tanda after insert: ${id}`);
    return created;
  }

  /**
   * Retrieves a tanda by primary key.
   * @param id - Tanda UUID
   */
  findById(id: string): Tanda | null {
    const row = this.db
      .prepare('SELECT * FROM tandas WHERE id = ?')
      .get(id) as TandaRow | undefined;
    return row ? rowToTanda(row) : null;
  }

  /**
   * Returns all tandas in which the given user is a participant (any role),
   * ordered by creation date descending.
   * @param userId - User UUID
   */
  findByUserId(userId: string): Tanda[] {
    const rows = this.db
      .prepare(
        `SELECT t.* FROM tandas t
         JOIN participants p ON p.tanda_id = t.id
         WHERE p.user_id = ?
         ORDER BY t.created_at DESC`,
      )
      .all(userId) as TandaRow[];
    return rows.map(rowToTanda);
  }
}

/**
 * Maps a raw database row to the domain Tanda entity.
 * @param row - Database row with snake_case columns
 */
function rowToTanda(row: TandaRow): Tanda {
  return {
    id: row.id,
    name: row.name,
    organizerId: row.organizer_id,
    contributionAmount: row.contribution_amount,
    status: row.status,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
    createdAt: row.created_at,
  };
}
