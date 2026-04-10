import Database from 'better-sqlite3';
import { Participant } from '../models/participant';

export class ParticipantRepository {
  constructor(private db: Database.Database) {}

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        tanda_id TEXT NOT NULL,
        role TEXT NOT NULL,
        rotation_position INTEGER NOT NULL,
        UNIQUE(user_id, tanda_id)
      )
    `);
  }

  create(participant: Participant): Participant {
    const stmt = this.db.prepare(`
      INSERT INTO participants (id, user_id, tanda_id, role, rotation_position)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      participant.id,
      participant.userId,
      participant.tandaId,
      participant.role,
      participant.rotationPosition
    );
    return participant;
  }

  findByTandaAndUser(tandaId: string, userId: string): Participant | null {
    const stmt = this.db.prepare(`
      SELECT id, user_id, tanda_id, role, rotation_position FROM participants
      WHERE tanda_id = ? AND user_id = ?
    `);
    const row = stmt.get(tandaId, userId) as any;
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      tandaId: row.tanda_id,
      role: row.role,
      rotationPosition: row.rotation_position,
    };
  }

  findByTanda(tandaId: string): Participant[] {
    const stmt = this.db.prepare(`
      SELECT id, user_id, tanda_id, role, rotation_position FROM participants
      WHERE tanda_id = ?
      ORDER BY rotation_position ASC
    `);
    const rows = stmt.all(tandaId) as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      tandaId: row.tanda_id,
      role: row.role,
      rotationPosition: row.rotation_position,
    }));
  }

  countByTanda(tandaId: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM participants WHERE tanda_id = ?
    `);
    const result = stmt.get(tandaId) as any;
    return result.count;
  }
}
