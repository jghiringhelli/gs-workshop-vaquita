import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';

export interface TandaRow {
  id: string;
  name: string;
  organizer_id: string;
  contribution_amount: number;
  status: TandaStatus;
  current_round: number;
  total_rounds: number;
  created_at: string;
}

export interface CreateTandaInput {
  name: string;
  organizerId: string;
  contributionAmount: number;
  totalRounds: number;
}

/**
 * Repository: all SQLite access for the tandas table.
 */
export const createTandasRepository = (db: Database.Database) => ({
  insert(input: CreateTandaInput): TandaRow {
    const row: TandaRow = {
      id: uuidv4(),
      name: input.name,
      organizer_id: input.organizerId,
      contribution_amount: input.contributionAmount,
      status: 'forming',
      current_round: 0,
      total_rounds: input.totalRounds,
      created_at: new Date().toISOString(),
    };
    db.prepare(`
      INSERT INTO tandas (id, name, organizer_id, contribution_amount, status, current_round, total_rounds, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(row.id, row.name, row.organizer_id, row.contribution_amount, row.status, row.current_round, row.total_rounds, row.created_at);
    return row;
  },

  findById(id: string): TandaRow | undefined {
    return db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as TandaRow | undefined;
  },

  /** Return all tandas a given user participates in. */
  findByUserId(userId: string): TandaRow[] {
    return db.prepare(`
      SELECT t.* FROM tandas t
      INNER JOIN participants p ON p.tanda_id = t.id
      WHERE p.user_id = ?
      ORDER BY t.created_at ASC
    `).all(userId) as TandaRow[];
  },

  findAll(): TandaRow[] {
    return db.prepare('SELECT * FROM tandas ORDER BY created_at ASC').all() as TandaRow[];
  },

  updateStatus(id: string, status: TandaStatus): void {
    db.prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
  },

  advanceRound(id: string, newRound: number, newStatus: TandaStatus): void {
    db.prepare('UPDATE tandas SET current_round = ?, status = ? WHERE id = ?').run(newRound, newStatus, id);
  },
});

export type TandasRepository = ReturnType<typeof createTandasRepository>;
