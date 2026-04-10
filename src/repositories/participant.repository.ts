import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';

export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: 'organizer' | 'member';
  rotationPosition: number | null;
  isDefaulter: number;
  consecutiveMissed: number;
  joinedAt: string;
}

export function createParticipant(
  userId: string,
  tandaId: string,
  role: 'organizer' | 'member' = 'member'
): Participant {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO participants (id, userId, tandaId, role, joinedAt) VALUES (?, ?, ?, ?, ?)'
  ).run(id, userId, tandaId, role, now);
  return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Participant;
}

export function findParticipantByUserAndTanda(userId: string, tandaId: string): Participant | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM participants WHERE userId = ? AND tandaId = ?').get(userId, tandaId) as Participant | undefined;
}

export function findParticipantById(id: string): Participant | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Participant | undefined;
}

export function listParticipantsByTanda(tandaId: string): Participant[] {
  const db = getDb();
  return db.prepare('SELECT * FROM participants WHERE tandaId = ? ORDER BY rotationPosition ASC, joinedAt ASC').all(tandaId) as Participant[];
}

export function updateParticipantPositions(assignments: { id: string; rotationPosition: number }[]): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE participants SET rotationPosition = ? WHERE id = ?');
  const updateAll = db.transaction((items: { id: string; rotationPosition: number }[]) => {
    for (const item of items) {
      stmt.run(item.rotationPosition, item.id);
    }
  });
  updateAll(assignments);
}

export function updateParticipantDefaulter(
  id: string,
  isDefaulter: boolean,
  consecutiveMissed: number
): void {
  const db = getDb();
  db.prepare('UPDATE participants SET isDefaulter = ?, consecutiveMissed = ? WHERE id = ?')
    .run(isDefaulter ? 1 : 0, consecutiveMissed, id);
}

export function resetConsecutiveMissed(id: string): void {
  const db = getDb();
  db.prepare('UPDATE participants SET consecutiveMissed = 0 WHERE id = ?').run(id);
}