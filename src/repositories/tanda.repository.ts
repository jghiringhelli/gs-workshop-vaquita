import { getDb } from '../db/database';

export interface TandaRow {
  id: number;
  name: string;
  organizer_id: number;
  contribution_amount: number;
  status: string;
  current_round: number;
  total_rounds: number;
}

export function createTanda(
  name: string,
  organizerId: number,
  contributionAmount: number,
  totalRounds: number
): TandaRow {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO tandas (name, organizer_id, contribution_amount, total_rounds) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(name, organizerId, contributionAmount, totalRounds);
  return {
    id: Number(result.lastInsertRowid),
    name,
    organizer_id: organizerId,
    contribution_amount: contributionAmount,
    status: 'forming',
    current_round: 0,
    total_rounds: totalRounds,
  };
}

export function findTandaById(id: number): TandaRow | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM tandas WHERE id = ?');
  return stmt.get(id) as TandaRow | undefined;
}

export function findTandasByUserId(userId: number): TandaRow[] {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT t.* FROM tandas t
     INNER JOIN participants p ON p.tanda_id = t.id
     WHERE p.user_id = ?`
  );
  return stmt.all(userId) as TandaRow[];
}

export function findAllTandas(): TandaRow[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM tandas');
  return stmt.all() as TandaRow[];
}

export function updateTandaStatus(id: number, status: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE tandas SET status = ? WHERE id = ?');
  stmt.run(status, id);
}

export function updateTandaRound(id: number, currentRound: number): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE tandas SET current_round = ? WHERE id = ?');
  stmt.run(currentRound, id);
}

export function updateTandaStatusAndRound(id: number, status: string, currentRound: number): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE tandas SET status = ?, current_round = ? WHERE id = ?');
  stmt.run(status, currentRound, id);
}

export function updateTotalRounds(id: number, totalRounds: number): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE tandas SET total_rounds = ? WHERE id = ?');
  stmt.run(totalRounds, id);
}
