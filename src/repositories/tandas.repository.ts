import db from '../db';
import { Tanda, TandaStatus } from '../types';

interface TandaRow {
  id: number;
  name: string;
  organizer_id: number;
  contribution_amount: number;
  status: TandaStatus;
  current_round: number;
  total_rounds: number;
}

function rowToTanda(row: TandaRow): Tanda {
  return {
    id: row.id,
    name: row.name,
    organizerId: row.organizer_id,
    contributionAmount: row.contribution_amount,
    status: row.status,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
  };
}

export function createTanda(name: string, organizerId: number, contributionAmount: number): Tanda {
  const stmt = db.prepare(
    'INSERT INTO tandas (name, organizer_id, contribution_amount, status, current_round, total_rounds) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(name, organizerId, contributionAmount, 'forming', 0, 0);
  return {
    id: result.lastInsertRowid as number,
    name,
    organizerId,
    contributionAmount,
    status: 'forming',
    currentRound: 0,
    totalRounds: 0,
  };
}

export function findTandaById(id: number): Tanda | undefined {
  const row = db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as TandaRow | undefined;
  return row ? rowToTanda(row) : undefined;
}

export function findTandasByUserId(userId: number): Tanda[] {
  const rows = db.prepare(
    `SELECT t.* FROM tandas t
     INNER JOIN participants p ON p.tanda_id = t.id
     WHERE p.user_id = ?`
  ).all(userId) as TandaRow[];
  return rows.map(rowToTanda);
}

export function findAllTandas(): Tanda[] {
  return (db.prepare('SELECT * FROM tandas').all() as TandaRow[]).map(rowToTanda);
}

export function updateTandaStatus(id: number, status: TandaStatus): void {
  db.prepare('UPDATE tandas SET status = ? WHERE id = ?').run(status, id);
}

export function updateTandaRound(id: number, currentRound: number): void {
  db.prepare('UPDATE tandas SET current_round = ? WHERE id = ?').run(currentRound, id);
}

export function updateTandaTotalRounds(id: number, totalRounds: number): void {
  db.prepare('UPDATE tandas SET total_rounds = ? WHERE id = ?').run(totalRounds, id);
}

export function startTanda(id: number, totalRounds: number): void {
  db.prepare('UPDATE tandas SET status = ?, current_round = ?, total_rounds = ? WHERE id = ?')
    .run('active', 1, totalRounds, id);
}
