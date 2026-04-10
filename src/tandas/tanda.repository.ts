import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { ITandaRepository, StartTandaData } from './tanda.repository.interface';
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

  /**
   * Atomically transitions a tanda to ACTIVE, assigns rotation positions to all
   * participants, and sets totalRounds — all within a single SQLite transaction.
   *
   * Using db.transaction() ensures that either every write succeeds or none do.
   * Prepared statements are created before the transaction for efficiency
   * (reused across the loop without re-parsing SQL on each iteration).
   *
   * @param tandaId - Tanda UUID
   * @param data - Rotation assignments and total round count computed by the service
   */
  startTanda(tandaId: string, data: StartTandaData): Tanda {
    const updateTanda = this.db.prepare(
      `UPDATE tandas SET status = 'active', total_rounds = ? WHERE id = ?`,
    );
    const updateParticipant = this.db.prepare(
      `UPDATE participants SET rotation_position = ? WHERE id = ?`,
    );

    this.db.transaction(() => {
      updateTanda.run(data.totalRounds, tandaId);
      for (const { participantId, rotationPosition } of data.assignments) {
        updateParticipant.run(rotationPosition, participantId);
      }
    })();

    const tanda = this.findById(tandaId);
    if (!tanda) throw new Error(`Failed to retrieve tanda after start: ${tandaId}`);
    return tanda;
  }

  /**
   * Transitions a tanda to CANCELLED status.
   * @param tandaId - Tanda UUID
   */
  cancelTanda(tandaId: string): Tanda {
    this.db
      .prepare(`UPDATE tandas SET status = 'cancelled' WHERE id = ?`)
      .run(tandaId);

    const tanda = this.findById(tandaId);
    if (!tanda) throw new Error(`Failed to retrieve tanda after cancel: ${tandaId}`);
    return tanda;
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
