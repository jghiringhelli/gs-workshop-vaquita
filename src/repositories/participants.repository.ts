import db from '../db';
import { Participant, ParticipantRole } from '../types';

interface ParticipantRow {
  id: number;
  user_id: number;
  tanda_id: number;
  role: ParticipantRole;
  rotation_position: number | null;
}

function rowToParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role,
    rotationPosition: row.rotation_position,
  };
}

export function addParticipant(userId: number, tandaId: number, role: ParticipantRole): Participant {
  const stmt = db.prepare(
    'INSERT INTO participants (user_id, tanda_id, role) VALUES (?, ?, ?)'
  );
  const result = stmt.run(userId, tandaId, role);
  return {
    id: result.lastInsertRowid as number,
    userId,
    tandaId,
    role,
    rotationPosition: null,
  };
}

export function findParticipantsByTandaId(tandaId: number): Participant[] {
  const rows = db.prepare('SELECT * FROM participants WHERE tanda_id = ?').all(tandaId) as ParticipantRow[];
  return rows.map(rowToParticipant);
}

export function findParticipantById(id: number): Participant | undefined {
  const row = db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as ParticipantRow | undefined;
  return row ? rowToParticipant(row) : undefined;
}

export function findParticipantByUserAndTanda(userId: number, tandaId: number): Participant | undefined {
  const row = db.prepare(
    'SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?'
  ).get(userId, tandaId) as ParticipantRow | undefined;
  return row ? rowToParticipant(row) : undefined;
}

export function countParticipants(tandaId: number): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM participants WHERE tanda_id = ?').get(tandaId) as { count: number };
  return row.count;
}

export function updateRotationPosition(participantId: number, position: number): void {
  db.prepare('UPDATE participants SET rotation_position = ? WHERE id = ?').run(position, participantId);
}
