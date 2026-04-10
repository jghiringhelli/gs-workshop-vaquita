import { v4 as uuidv4 } from 'uuid';
import type { DB } from '../db/db';

export type ParticipantRole = 'organizer' | 'member';

export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  rotationPosition: number | null;
  isDefaulter: boolean;
  consecutiveMissed: number;
  joinedAt: string;
}

/** Raw row as stored in SQLite (isDefaulter is 0/1). */
interface ParticipantRow extends Omit<Participant, 'isDefaulter'> {
  isDefaulter: number;
}

function mapRow(row: ParticipantRow): Participant {
  return { ...row, isDefaulter: row.isDefaulter === 1 };
}

export function createParticipantsRepo(db: DB) {
  return {
    findById(id: string): Participant | undefined {
      const row = db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as ParticipantRow | undefined;
      return row ? mapRow(row) : undefined;
    },

    findByTandaId(tandaId: string): Participant[] {
      const rows = db.prepare(
        'SELECT * FROM participants WHERE tandaId = ? ORDER BY rotationPosition ASC, joinedAt ASC',
      ).all(tandaId) as ParticipantRow[];
      return rows.map(mapRow);
    },

    findByUserAndTanda(userId: string, tandaId: string): Participant | undefined {
      const row = db.prepare(
        'SELECT * FROM participants WHERE userId = ? AND tandaId = ?',
      ).get(userId, tandaId) as ParticipantRow | undefined;
      return row ? mapRow(row) : undefined;
    },

    countByTanda(tandaId: string): number {
      const r = db.prepare(
        'SELECT COUNT(*) as count FROM participants WHERE tandaId = ?',
      ).get(tandaId) as { count: number };
      return r.count;
    },

    create(data: { userId: string; tandaId: string; role: ParticipantRole }): Participant {
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO participants (id, userId, tandaId, role, rotationPosition, isDefaulter, consecutiveMissed, joinedAt)
        VALUES (?, ?, ?, ?, NULL, 0, 0, ?)
      `).run(id, data.userId, data.tandaId, data.role, now);
      return this.findById(id)!;
    },

    updateRotationPositions(updates: Array<{ id: string; rotationPosition: number }>): void {
      const stmt = db.prepare('UPDATE participants SET rotationPosition = ? WHERE id = ?');
      db.transaction(() => {
        for (const u of updates) stmt.run(u.rotationPosition, u.id);
      })();
    },

    updateDefaulterStatus(id: string, isDefaulter: boolean, consecutiveMissed: number): void {
      db.prepare('UPDATE participants SET isDefaulter = ?, consecutiveMissed = ? WHERE id = ?')
        .run(isDefaulter ? 1 : 0, consecutiveMissed, id);
    },
  };
}

export type ParticipantsRepo = ReturnType<typeof createParticipantsRepo>;
