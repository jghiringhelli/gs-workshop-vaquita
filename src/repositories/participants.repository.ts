import type Database from 'better-sqlite3';
import type { Participant, ParticipantRole } from '../types';

export function createParticipantsRepository(db: Database.Database) {
  return {
    findByTandaId(tandaId: number): Participant[] {
      return db.prepare(
        'SELECT * FROM participants WHERE tanda_id = ? ORDER BY rotation_position ASC, id ASC'
      ).all(tandaId) as Participant[];
    },
    findByTandaAndUser(tandaId: number, userId: number): Participant | undefined {
      return db.prepare(
        'SELECT * FROM participants WHERE tanda_id = ? AND user_id = ?'
      ).get(tandaId, userId) as Participant | undefined;
    },
    findById(id: number): Participant | undefined {
      return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Participant | undefined;
    },
    countByTanda(tandaId: number): number {
      const row = db.prepare(
        'SELECT COUNT(*) as cnt FROM participants WHERE tanda_id = ?'
      ).get(tandaId) as { cnt: number };
      return row.cnt;
    },
    create(userId: number, tandaId: number, role: ParticipantRole): Participant {
      return db.prepare(
        'INSERT INTO participants (user_id, tanda_id, role) VALUES (?, ?, ?) RETURNING *'
      ).get(userId, tandaId, role) as Participant;
    },
    setRotationPositions(assignments: Array<{ id: number; position: number }>): void {
      const stmt = db.prepare('UPDATE participants SET rotation_position = ? WHERE id = ?');
      for (const a of assignments) {
        stmt.run(a.position, a.id);
      }
    },
  };
}

export type ParticipantsRepository = ReturnType<typeof createParticipantsRepository>;
