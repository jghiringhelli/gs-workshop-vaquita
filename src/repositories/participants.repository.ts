import { getDb } from '../db';
import type { Participant, ParticipantRole } from '../types';

export function addParticipant(
  tandaId: number,
  userId: number,
  role: ParticipantRole,
): Participant {
  return getDb()
    .prepare<[number, number, ParticipantRole], Participant>(
      'INSERT INTO participants (tandaId, userId, role) VALUES (?, ?, ?) RETURNING *',
    )
    .get(tandaId, userId, role) as Participant;
}

export function findParticipant(
  tandaId: number,
  userId: number,
): Participant | undefined {
  return getDb()
    .prepare<[number, number], Participant>(
      'SELECT * FROM participants WHERE tandaId = ? AND userId = ?',
    )
    .get(tandaId, userId);
}

export function findParticipantById(id: number): Participant | undefined {
  return getDb()
    .prepare<[number], Participant>('SELECT * FROM participants WHERE id = ?')
    .get(id);
}

export function listParticipants(tandaId: number): Participant[] {
  return getDb()
    .prepare<[number], Participant>(
      'SELECT * FROM participants WHERE tandaId = ? ORDER BY id',
    )
    .all(tandaId);
}

export function setRotationPosition(participantId: number, position: number): void {
  getDb()
    .prepare<[number, number]>(
      'UPDATE participants SET rotationPosition = ? WHERE id = ?',
    )
    .run(position, participantId);
}

export function markDefaulter(participantId: number): void {
  getDb()
    .prepare<[number]>('UPDATE participants SET isDefaulter = 1 WHERE id = ?')
    .run(participantId);
}
