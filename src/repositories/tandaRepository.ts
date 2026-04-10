import { getDb } from '../db/database';

export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';

export interface Tanda {
  id: number;
  name: string;
  organizerId: number;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
  createdAt: string;
}

export function createTanda(
  name: string,
  organizerId: number,
  contributionAmount: number
): Tanda {
  const db = getDb();
  return db
    .prepare<[string, number, number], Tanda>(
      'INSERT INTO tandas (name, organizerId, contributionAmount) VALUES (?, ?, ?) RETURNING *'
    )
    .get(name, organizerId, contributionAmount) as Tanda;
}

export function getTandaById(id: number): Tanda | undefined {
  const db = getDb();
  return db.prepare<[number], Tanda>('SELECT * FROM tandas WHERE id = ?').get(id);
}

export function listTandasForUser(userId: number): Tanda[] {
  const db = getDb();
  return db
    .prepare<[number], Tanda>(
      `SELECT t.* FROM tandas t
       INNER JOIN participants p ON p.tandaId = t.id
       WHERE p.userId = ?
       ORDER BY t.id`
    )
    .all(userId);
}

export function updateTandaStatus(id: number, status: TandaStatus): void {
  const db = getDb();
  db.prepare<[string, number]>('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
}

export function setTandaActive(id: number, totalRounds: number): void {
  const db = getDb();
  db
    .prepare<[number, number]>(
      "UPDATE tandas SET status = 'active', currentRound = 1, totalRounds = ? WHERE id = ?"
    )
    .run(totalRounds, id);
}

export function advanceTandaRound(id: number, nextRound: number): void {
  const db = getDb();
  db
    .prepare<[number, number]>('UPDATE tandas SET currentRound = ? WHERE id = ?')
    .run(nextRound, id);
}

export function completeTanda(id: number): void {
  const db = getDb();
  db
    .prepare<[number]>("UPDATE tandas SET status = 'completed' WHERE id = ?")
    .run(id);
}
