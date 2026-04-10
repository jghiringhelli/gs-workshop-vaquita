import { db } from '../db/database';
import { Contribution } from '../types';

export function create(data: { tandaId: number; participantId: number; round: number; amount: number; status: string }): Contribution {
  const stmt = db.prepare(
    'INSERT INTO contributions (tandaId, participantId, round, amount, status) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(data.tandaId, data.participantId, data.round, data.amount, data.status);
  return db.prepare('SELECT * FROM contributions WHERE id = ?').get(result.lastInsertRowid as number) as Contribution;
}

export function findByTandaAndRound(tandaId: number, round: number): Contribution[] {
  return db.prepare('SELECT * FROM contributions WHERE tandaId = ? AND round = ?').all(tandaId, round) as Contribution[];
}

export function findByParticipant(participantId: number): Contribution[] {
  return db.prepare('SELECT * FROM contributions WHERE participantId = ?').all(participantId) as Contribution[];
}

export function findByParticipantAndRound(participantId: number, round: number): Contribution | undefined {
  return db.prepare('SELECT * FROM contributions WHERE participantId = ? AND round = ?').get(participantId, round) as Contribution | undefined;
}

export function updateStatus(id: number, status: string): Contribution {
  db.prepare("UPDATE contributions SET status = ?, paidAt = datetime('now') WHERE id = ?").run(status, id);
  return db.prepare('SELECT * FROM contributions WHERE id = ?').get(id) as Contribution;
}

export function updateAmountAndStatus(id: number, amount: number, status: string): Contribution {
  db.prepare("UPDATE contributions SET amount = ?, status = ?, paidAt = datetime('now') WHERE id = ?").run(amount, status, id);
  return db.prepare('SELECT * FROM contributions WHERE id = ?').get(id) as Contribution;
}

export function findLastNByParticipant(participantId: number, n: number): Contribution[] {
  return db.prepare('SELECT * FROM contributions WHERE participantId = ? ORDER BY round DESC LIMIT ?').all(participantId, n) as Contribution[];
}
