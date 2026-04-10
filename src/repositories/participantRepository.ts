import { getDb } from '../db/database';

export type ParticipantRole = 'organizer' | 'member';

export interface Participant {
  id: number;
  userId: number;
  tandaId: number;
  role: ParticipantRole;
  rotationPosition: number | null;
  consecutiveMissed: number;
  isDefaulter: number;
  createdAt: string;
}

export function addParticipant(
  userId: number,
  tandaId: number,
  role: ParticipantRole = 'member'
): Participant {
  const db = getDb();
  return db
    .prepare<[number, number, string], Participant>(
      'INSERT INTO participants (userId, tandaId, role) VALUES (?, ?, ?) RETURNING *'
    )
    .get(userId, tandaId, role) as Participant;
}

export function getParticipant(userId: number, tandaId: number): Participant | undefined {
  const db = getDb();
  return db
    .prepare<[number, number], Participant>(
      'SELECT * FROM participants WHERE userId = ? AND tandaId = ?'
    )
    .get(userId, tandaId);
}

export function getParticipantById(id: number): Participant | undefined {
  const db = getDb();
  return db.prepare<[number], Participant>('SELECT * FROM participants WHERE id = ?').get(id);
}

export function listParticipants(tandaId: number): Participant[] {
  const db = getDb();
  return db
    .prepare<[number], Participant>(
      'SELECT * FROM participants WHERE tandaId = ? ORDER BY rotationPosition, id'
    )
    .all(tandaId);
}

export function assignRotationPositions(tandaId: number, orderedParticipantIds: number[]): void {
  const db = getDb();
  const stmt = db.prepare<[number, number]>(
    'UPDATE participants SET rotationPosition = ? WHERE id = ?'
  );
  const tx = db.transaction(() => {
    orderedParticipantIds.forEach((pid, index) => {
      stmt.run(index + 1, pid);
    });
  });
  tx();
}

export function countParticipants(tandaId: number): number {
  const db = getDb();
  const row = db
    .prepare<[number], { count: number }>('SELECT COUNT(*) as count FROM participants WHERE tandaId = ?')
    .get(tandaId);
  return row?.count ?? 0;
}

export function updateConsecutiveMissed(
  participantId: number,
  consecutiveMissed: number,
  isDefaulter: boolean
): void {
  const db = getDb();
  db
    .prepare<[number, number, number]>(
      'UPDATE participants SET consecutiveMissed = ?, isDefaulter = ? WHERE id = ?'
    )
    .run(consecutiveMissed, isDefaulter ? 1 : 0, participantId);
}

export function resetConsecutiveMissed(participantId: number): void {
  const db = getDb();
  db
    .prepare<[number]>('UPDATE participants SET consecutiveMissed = 0 WHERE id = ?')
    .run(participantId);
}
