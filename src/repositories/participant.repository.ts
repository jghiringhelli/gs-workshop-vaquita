import { getDb } from '../db/database';

export interface ParticipantRow {
  id: number;
  user_id: number;
  tanda_id: number;
  role: string;
  rotation_position: number | null;
  is_defaulter: number;
}

export function createParticipant(userId: number, tandaId: number, role: string): ParticipantRow {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO participants (user_id, tanda_id, role) VALUES (?, ?, ?)'
  );
  const result = stmt.run(userId, tandaId, role);
  return {
    id: Number(result.lastInsertRowid),
    user_id: userId,
    tanda_id: tandaId,
    role,
    rotation_position: null,
    is_defaulter: 0,
  };
}

export function findParticipantsByTandaId(tandaId: number): ParticipantRow[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM participants WHERE tanda_id = ?');
  return stmt.all(tandaId) as ParticipantRow[];
}

export function findParticipantByUserAndTanda(userId: number, tandaId: number): ParticipantRow | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?');
  return stmt.get(userId, tandaId) as ParticipantRow | undefined;
}

export function findParticipantById(id: number): ParticipantRow | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM participants WHERE id = ?');
  return stmt.get(id) as ParticipantRow | undefined;
}

export function countParticipantsByTandaId(tandaId: number): number {
  const db = getDb();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM participants WHERE tanda_id = ?');
  const row = stmt.get(tandaId) as { count: number };
  return row.count;
}

export function updateRotationPosition(participantId: number, position: number): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE participants SET rotation_position = ? WHERE id = ?');
  stmt.run(position, participantId);
}

export function setDefaulter(participantId: number, isDefaulter: boolean): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE participants SET is_defaulter = ? WHERE id = ?');
  stmt.run(isDefaulter ? 1 : 0, participantId);
}
