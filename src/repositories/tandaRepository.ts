import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';

export interface TandaRow {
  id: string;
  name: string;
  organizerId: number;
  contributionAmount: number;
  status: string;
  currentRound: number | null;
  totalRounds: number | null;
}

export function createTanda(
  data: { name: string; organizerId: number; contributionAmount: number },
  db: Database.Database = getDb(),
): TandaRow {
  const id = uuidv4();
  db.prepare(
    'INSERT INTO tandas (id, name, organizerId, contributionAmount, status, currentRound, totalRounds) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, data.name, data.organizerId, data.contributionAmount, 'forming', null, null);
  return {
    id,
    name: data.name,
    organizerId: data.organizerId,
    contributionAmount: data.contributionAmount,
    status: 'forming',
    currentRound: null,
    totalRounds: null,
  };
}

export function findAllTandas(db: Database.Database = getDb()): TandaRow[] {
  return db.prepare('SELECT * FROM tandas').all() as TandaRow[];
}

export function findTandasByUserId(userId: number, db: Database.Database = getDb()): TandaRow[] {
  return db
    .prepare(
      'SELECT t.* FROM tandas t JOIN participants p ON t.id = p.tandaId WHERE p.userId = ?',
    )
    .all(userId) as TandaRow[];
}

export function findTandaById(id: string, db: Database.Database = getDb()): TandaRow | undefined {
  return db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as TandaRow | undefined;
}

export function updateTanda(
  id: string,
  data: Partial<Omit<TandaRow, 'id'>>,
  db: Database.Database = getDb(),
): void {
  const fields = Object.keys(data)
    .map((k) => `${k} = ?`)
    .join(', ');
  const values = Object.values(data);
  db.prepare(`UPDATE tandas SET ${fields} WHERE id = ?`).run(...(values as any[]), id);
}
