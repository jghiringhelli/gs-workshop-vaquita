import { getDb } from '../db';
import type { Tanda, TandaStatus } from '../types';

export function createTanda(
  name: string,
  organizerId: number,
  contributionAmount: number,
): Tanda {
  return getDb()
    .prepare<[string, number, number], Tanda>(
      'INSERT INTO tandas (name, organizerId, contributionAmount) VALUES (?, ?, ?) RETURNING *',
    )
    .get(name, organizerId, contributionAmount) as Tanda;
}

export function findTandaById(id: number): Tanda | undefined {
  return getDb()
    .prepare<[number], Tanda>('SELECT * FROM tandas WHERE id = ?')
    .get(id);
}

export function listTandasForUser(userId: number): Tanda[] {
  return getDb()
    .prepare<[number], Tanda>(
      `SELECT t.*
       FROM tandas t
       INNER JOIN participants p ON p.tandaId = t.id
       WHERE p.userId = ?
       ORDER BY t.id`,
    )
    .all(userId);
}

export function updateTandaStatus(id: number, status: TandaStatus): void {
  getDb()
    .prepare<[TandaStatus, number]>('UPDATE tandas SET status = ? WHERE id = ?')
    .run(status, id);
}

export function updateTandaRound(
  id: number,
  currentRound: number,
  totalRounds: number,
  status: TandaStatus,
): void {
  getDb()
    .prepare<[number, number, TandaStatus, number]>(
      'UPDATE tandas SET currentRound = ?, totalRounds = ?, status = ? WHERE id = ?',
    )
    .run(currentRound, totalRounds, status, id);
}

export function advanceTandaRound(id: number, nextRound: number, status: TandaStatus): void {
  getDb()
    .prepare<[number, TandaStatus, number]>(
      'UPDATE tandas SET currentRound = ?, status = ? WHERE id = ?',
    )
    .run(nextRound, status, id);
}
