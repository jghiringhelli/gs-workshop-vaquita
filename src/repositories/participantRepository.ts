import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: 'organizer' | 'member';
  rotationPosition: number | null;
  isDefaulter: number; // 0 or 1 (SQLite INTEGER)
}

export class ParticipantRepository {
  constructor(private db: Database.Database) {}

  findByTandaId(tandaId: string): Participant[] {
    return this.db.prepare('SELECT * FROM participants WHERE tandaId = ?').all(tandaId) as Participant[];
  }

  findByUserAndTanda(userId: string, tandaId: string): Participant | undefined {
    return this.db.prepare('SELECT * FROM participants WHERE userId = ? AND tandaId = ?').get(userId, tandaId) as Participant | undefined;
  }

  findById(id: string): Participant | undefined {
    return this.db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Participant | undefined;
  }

  create(data: { userId: string; tandaId: string; role: 'organizer' | 'member' }): Participant {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO participants (id, userId, tandaId, role, rotationPosition, isDefaulter)
      VALUES (?, ?, ?, ?, NULL, 0)
    `).run(id, data.userId, data.tandaId, data.role);
    return this.findById(id) as Participant;
  }

  updateRotationPosition(id: string, rotationPosition: number): void {
    this.db.prepare('UPDATE participants SET rotationPosition = ? WHERE id = ?').run(rotationPosition, id);
  }

  countByTandaId(tandaId: string): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM participants WHERE tandaId = ?').get(tandaId) as { count: number };
    return row.count;
  }

  updateDefaulterStatus(id: string, isDefaulter: boolean): void {
    this.db.prepare('UPDATE participants SET isDefaulter = ? WHERE id = ?').run(isDefaulter ? 1 : 0, id);
  }
}
