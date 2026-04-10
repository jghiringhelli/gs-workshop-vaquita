import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Tanda, CreateTandaDto, TandaStatus } from '../tandas/types';

/** Contract for tanda persistence operations. */
export interface ITandaRepository {
  /**
   * Persists a new tanda.
   * @param dto - Tanda creation data.
   * @returns The created Tanda entity.
   */
  create(dto: CreateTandaDto): Tanda;

  /**
   * Finds a tanda by primary key.
   * @param id - Tanda UUID.
   * @returns Tanda entity or null if not found.
   */
  findById(id: string): Tanda | null;

  /**
   * Returns all tandas that a user participates in.
   * @param userId - User UUID.
   * @returns Read-only array of Tanda entities.
   */
  findByUserId(userId: string): ReadonlyArray<Tanda>;

  /**
   * Updates the status of a tanda.
   * @param id - Tanda UUID.
   * @param status - New status value.
   */
  updateStatus(id: string, status: TandaStatus): void;

  /**
   * Updates the current and total rounds of a tanda.
   * @param id - Tanda UUID.
   * @param currentRound - New current round number.
   * @param totalRounds - Total number of rounds.
   */
  updateRound(id: string, currentRound: number, totalRounds: number): void;
}

interface TandaRow {
  id: string;
  name: string;
  organizer_id: string;
  contribution_amount: number;
  status: string;
  current_round: number;
  total_rounds: number;
  created_at: string;
}

function rowToTanda(row: TandaRow): Tanda {
  return {
    id: row.id,
    name: row.name,
    organizerId: row.organizer_id,
    contributionAmount: row.contribution_amount,
    status: row.status as TandaStatus,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
    createdAt: row.created_at,
  };
}

/** SQLite-backed implementation of ITandaRepository. */
export class SqliteTandaRepository implements ITandaRepository {
  constructor(private readonly db: Database.Database) {}

  create(dto: CreateTandaDto): Tanda {
    const id = uuidv4();
    this.db
      .prepare('INSERT INTO tandas (id, name, organizer_id, contribution_amount) VALUES (?, ?, ?, ?)')
      .run(id, dto.name, dto.organizerId, dto.contributionAmount);
    return this.findById(id) as Tanda;
  }

  findById(id: string): Tanda | null {
    const row = this.db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as TandaRow | undefined;
    return row ? rowToTanda(row) : null;
  }

  findByUserId(userId: string): ReadonlyArray<Tanda> {
    const rows = this.db
      .prepare(
        `SELECT t.* FROM tandas t
         JOIN participants p ON p.tanda_id = t.id
         WHERE p.user_id = ?
         ORDER BY t.created_at ASC`,
      )
      .all(userId) as TandaRow[];
    return rows.map(rowToTanda);
  }

  updateStatus(id: string, status: TandaStatus): void {
    this.db.prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
  }

  updateRound(id: string, currentRound: number, totalRounds: number): void {
    this.db
      .prepare('UPDATE tandas SET current_round = ?, total_rounds = ? WHERE id = ?')
      .run(currentRound, totalRounds, id);
  }
}
