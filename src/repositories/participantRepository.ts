import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface Participant {
  id: string;
  user_id: string;
  tanda_id: string;
  role: 'organizer' | 'member';
  rotation_position: number | null;
  consecutive_misses: number;
  is_defaulter: number;
}

export const participantRepository = {
  create(userId: string, tandaId: string, role: 'organizer' | 'member'): Participant {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO participants (id, user_id, tanda_id, role) VALUES (?, ?, ?, ?)`,
    ).run(id, userId, tandaId, role);
    return this.findById(id)!;
  },

  findById(id: string): Participant | undefined {
    return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Participant | undefined;
  },

  findByTanda(tandaId: string): Participant[] {
    return db.prepare('SELECT * FROM participants WHERE tanda_id = ? ORDER BY rotation_position ASC NULLS LAST').all(tandaId) as Participant[];
  },

  findByUserAndTanda(userId: string, tandaId: string): Participant | undefined {
    return db.prepare('SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?').get(userId, tandaId) as Participant | undefined;
  },

  countByTanda(tandaId: string): number {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM participants WHERE tanda_id = ?').get(tandaId) as { cnt: number };
    return row.cnt;
  },

  assignRotation(tandaId: string, positions: { id: string; position: number }[]): void {
    const stmt = db.prepare('UPDATE participants SET rotation_position = ? WHERE id = ?');
    const trx = db.transaction(() => {
      for (const { id, position } of positions) {
        stmt.run(position, id);
      }
    });
    trx();
  },

  incrementConsecutiveMisses(id: string): void {
    db.prepare('UPDATE participants SET consecutive_misses = consecutive_misses + 1 WHERE id = ?').run(id);
  },

  resetConsecutiveMisses(id: string): void {
    db.prepare('UPDATE participants SET consecutive_misses = 0 WHERE id = ?').run(id);
  },

  flagDefaulter(id: string): void {
    db.prepare('UPDATE participants SET is_defaulter = 1 WHERE id = ?').run(id);
  },
};
