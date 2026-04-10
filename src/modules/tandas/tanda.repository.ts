import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db/database';

export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  currentRound: number;
  totalRounds: number;
  createdAt: string;
}

export function createTanda(
  name: string,
  organizerId: string,
  contributionAmount: number
): Tanda {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO tandas (id, name, organizerId, contributionAmount, status, currentRound, totalRounds, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, organizerId, contributionAmount, 'forming', 0, 0, now);
  return db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as Tanda;
}

export function findTandaById(id: string): Tanda | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as Tanda | undefined;
}

export function listTandasByUser(userId: string): Tanda[] {
  const db = getDb();
  return db.prepare(
    `SELECT t.* FROM tandas t
     INNER JOIN participants p ON p.tandaId = t.id
     WHERE p.userId = ?
     ORDER BY t.createdAt DESC`
  ).all(userId) as Tanda[];
}

export function listAllTandas(): Tanda[] {
  const db = getDb();
  return db.prepare('SELECT * FROM tandas ORDER BY createdAt DESC').all() as Tanda[];
}

export function updateTandaStatus(id: string, status: Tanda['status']): void {
  const db = getDb();
  db.prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
}

export function updateTandaStart(id: string, totalRounds: number): void {
  const db = getDb();
  db.prepare('UPDATE tandas SET status = ?, currentRound = ?, totalRounds = ? WHERE id = ?')
    .run('active', 1, totalRounds, id);
}

export function incrementTandaRound(id: string): void {
  const db = getDb();
  db.prepare('UPDATE tandas SET currentRound = currentRound + 1 WHERE id = ?').run(id);
}
