import Database from 'better-sqlite3';
import { Tanda, TandaStatus } from '../models';
import { ITandaRepository } from './interfaces';

type TandaRow = {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: string;
  currentRound: number;
  totalRounds: number;
  createdAt: string;
};

function rowToTanda(row: TandaRow): Tanda {
  return { ...row, status: row.status as TandaStatus };
}

export class TandaRepository implements ITandaRepository {
  constructor(private readonly db: Database.Database) {}

  create(data: Omit<Tanda, 'createdAt'>): Tanda {
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO tandas (id, name, organizerId, contributionAmount, status, currentRound, totalRounds, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        data.id,
        data.name,
        data.organizerId,
        data.contributionAmount,
        data.status,
        data.currentRound,
        data.totalRounds,
        createdAt,
      );
    return { ...data, createdAt };
  }

  findById(id: string): Tanda | null {
    const row = this.db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as TandaRow | undefined;
    return row ? rowToTanda(row) : null;
  }

  findByUserId(userId: string): Tanda[] {
    const rows = this.db
      .prepare(
        `SELECT t.* FROM tandas t
         JOIN participants p ON p.tandaId = t.id
         WHERE p.userId = ?
         ORDER BY t.createdAt DESC`,
      )
      .all(userId) as TandaRow[];
    return rows.map(rowToTanda);
  }

  update(id: string, data: Partial<Pick<Tanda, 'status' | 'currentRound' | 'totalRounds'>>): Tanda {
    const fields = Object.keys(data)
      .map((k) => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(data), id];
    this.db.prepare(`UPDATE tandas SET ${fields} WHERE id = ?`).run(...values);
    return this.findById(id)!;
  }
}
