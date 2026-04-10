import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';

export interface ParticipantRow {
  id: string;
  userId: number;
  tandaId: string;
  role: string;
  rotationPosition: number | null;
}

export function createParticipant(
  data: { userId: number; tandaId: string; role: string },
  db: Database.Database = getDb(),
): ParticipantRow {
  const id = uuidv4();
  db.prepare(
    'INSERT INTO participants (id, userId, tandaId, role, rotationPosition) VALUES (?, ?, ?, ?, ?)',
  ).run(id, data.userId, data.tandaId, data.role, null);
  return { id, userId: data.userId, tandaId: data.tandaId, role: data.role, rotationPosition: null };
}

export function findParticipantsByTandaId(
  tandaId: string,
  db: Database.Database = getDb(),
): ParticipantRow[] {
  return db
    .prepare('SELECT * FROM participants WHERE tandaId = ?')
    .all(tandaId) as ParticipantRow[];
}

export function findParticipantByUserAndTanda(
  userId: number,
  tandaId: string,
  db: Database.Database = getDb(),
): ParticipantRow | undefined {
  return db
    .prepare('SELECT * FROM participants WHERE userId = ? AND tandaId = ?')
    .get(userId, tandaId) as ParticipantRow | undefined;
}

export function findParticipantById(
  id: string,
  db: Database.Database = getDb(),
): ParticipantRow | undefined {
  return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as ParticipantRow | undefined;
}

export function updateParticipantRotationPosition(
  id: string,
  rotationPosition: number,
  db: Database.Database = getDb(),
): void {
  db.prepare('UPDATE participants SET rotationPosition = ? WHERE id = ?').run(rotationPosition, id);
}
