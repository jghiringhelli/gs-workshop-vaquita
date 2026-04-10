import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
  createdAt: string;
}

export function createContribution(
  tandaId: string,
  participantId: string,
  round: number,
  amount: number,
  status: Contribution['status'] = 'paid'
): Contribution {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO contributions (id, tandaId, participantId, round, amount, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, tandaId, participantId, round, amount, status, now);
  return db.prepare('SELECT * FROM contributions WHERE id = ?').get(id) as Contribution;
}

export function findContributionByParticipantAndRound(
  participantId: string,
  round: number
): Contribution | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM contributions WHERE participantId = ? AND round = ?').get(participantId, round) as Contribution | undefined;
}

export function listContributionsByRound(tandaId: string, round: number): Contribution[] {
  const db = getDb();
  return db.prepare('SELECT * FROM contributions WHERE tandaId = ? AND round = ?').all(tandaId, round) as Contribution[];
}

export function listContributionsByParticipant(participantId: string): Contribution[] {
  const db = getDb();
  return db.prepare('SELECT * FROM contributions WHERE participantId = ? ORDER BY round ASC').all(participantId) as Contribution[];
}

export function listContributionsByParticipantInTanda(participantId: string, tandaId: string): Contribution[] {
  const db = getDb();
  return db.prepare('SELECT * FROM contributions WHERE participantId = ? AND tandaId = ? ORDER BY round ASC').all(participantId, tandaId) as Contribution[];
}