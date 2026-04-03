import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export type ParticipantRole = 'organizer' | 'member';

export interface ParticipantRow {
  id: string;
  user_id: string;
  tanda_id: string;
  role: ParticipantRole;
  rotation_position: number | null;
  consecutive_missed: number;
  is_defaulter: number; // SQLite stores booleans as integers
}

export interface CreateParticipantInput {
  userId: string;
  tandaId: string;
  role: ParticipantRole;
}

/**
 * Repository: all SQLite access for the participants table.
 */
export const createParticipantsRepository = (db: Database.Database) => ({
  insert(input: CreateParticipantInput): ParticipantRow {
    const row: ParticipantRow = {
      id: uuidv4(),
      user_id: input.userId,
      tanda_id: input.tandaId,
      role: input.role,
      rotation_position: null,
      consecutive_missed: 0,
      is_defaulter: 0,
    };
    db.prepare(`
      INSERT INTO participants (id, user_id, tanda_id, role, rotation_position, consecutive_missed, is_defaulter)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(row.id, row.user_id, row.tanda_id, row.role, row.rotation_position, row.consecutive_missed, row.is_defaulter);
    return row;
  },

  findByTandaId(tandaId: string): ParticipantRow[] {
    return db.prepare('SELECT * FROM participants WHERE tanda_id = ? ORDER BY rotation_position ASC, id ASC').all(tandaId) as ParticipantRow[];
  },

  findByTandaAndUser(tandaId: string, userId: string): ParticipantRow | undefined {
    return db.prepare('SELECT * FROM participants WHERE tanda_id = ? AND user_id = ?').get(tandaId, userId) as ParticipantRow | undefined;
  },

  findById(id: string): ParticipantRow | undefined {
    return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as ParticipantRow | undefined;
  },

  /** Assign rotation positions in bulk (called when tanda starts). */
  assignRotations(assignments: Array<{ id: string; position: number }>): void {
    const stmt = db.prepare('UPDATE participants SET rotation_position = ? WHERE id = ?');
    const runAll = db.transaction(() => {
      for (const a of assignments) stmt.run(a.position, a.id);
    });
    runAll();
  },

  updateMissedStats(id: string, consecutiveMissed: number, isDefaulter: boolean): void {
    db.prepare('UPDATE participants SET consecutive_missed = ?, is_defaulter = ? WHERE id = ?')
      .run(consecutiveMissed, isDefaulter ? 1 : 0, id);
  },

  resetConsecutiveMissed(id: string): void {
    db.prepare('UPDATE participants SET consecutive_missed = 0 WHERE id = ?').run(id);
  },
});

export type ParticipantsRepository = ReturnType<typeof createParticipantsRepository>;
