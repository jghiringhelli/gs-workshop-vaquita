import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Tanda, TandaStatus, CreateTandaDto } from './Tanda';
import { ITandaRepository } from './ITandaRepository';

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

export class SqliteTandaRepository implements ITandaRepository {
  constructor(private readonly db: Database.Database) {}

  create(dto: CreateTandaDto): Tanda {
    const tanda: Tanda = {
      id: uuidv4(),
      name: dto.name,
      organizerId: dto.organizerId,
      contributionAmount: dto.contributionAmount,
      status: 'forming',
      currentRound: 1,
      totalRounds: 0,
      createdAt: new Date().toISOString(),
    };
    this.db
      .prepare(
        'INSERT INTO tandas (id, name, organizer_id, contribution_amount, status, current_round, total_rounds, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        tanda.id,
        tanda.name,
        tanda.organizerId,
        tanda.contributionAmount,
        tanda.status,
        tanda.currentRound,
        tanda.totalRounds,
        tanda.createdAt,
      );
    return tanda;
  }

  findById(id: string): Tanda | null {
    const row = this.db
      .prepare('SELECT * FROM tandas WHERE id = ?')
      .get(id) as TandaRow | undefined;
    return row ? rowToTanda(row) : null;
  }

  findByUserId(userId: string): Tanda[] {
    const rows = this.db
      .prepare(
        'SELECT t.* FROM tandas t JOIN participants p ON t.id = p.tanda_id WHERE p.user_id = ? ORDER BY t.created_at DESC',
      )
      .all(userId) as TandaRow[];
    return rows.map(rowToTanda);
  }

  updateStatus(id: string, status: TandaStatus): void {
    this.db.prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
  }

  updateCurrentRound(id: string, round: number): void {
    this.db.prepare('UPDATE tandas SET current_round = ? WHERE id = ?').run(round, id);
  }

  updateTotalRounds(id: string, totalRounds: number): void {
    this.db.prepare('UPDATE tandas SET total_rounds = ? WHERE id = ?').run(totalRounds, id);
  }
}
