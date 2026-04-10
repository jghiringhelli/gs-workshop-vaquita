/**
 * Participant Repository
 * Handles all participant persistence operations
 */

import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { Participant, ParticipantRole, ParticipantRepository as IParticipantRepository } from '../types/index.js';

export class ParticipantRepository implements IParticipantRepository {
  constructor(private db: Database.Database) {}

  create(participantData: Omit<Participant, 'id' | 'createdAt'>): Participant {
    const id = uuidv4();
    const createdAt = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO participants (id, user_id, tanda_id, role, rotation_position, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      participantData.userId,
      participantData.tandaId,
      participantData.role,
      participantData.rotationPosition,
      createdAt.toISOString(),
    );

    return {
      id,
      userId: participantData.userId,
      tandaId: participantData.tandaId,
      role: participantData.role,
      rotationPosition: participantData.rotationPosition,
      createdAt,
    };
  }

  findById(id: string): Participant | null {
    const stmt = this.db.prepare('SELECT * FROM participants WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.mapRowToParticipant(row) : null;
  }

  findByTandaId(tandaId: string): Participant[] {
    const stmt = this.db.prepare(
      'SELECT * FROM participants WHERE tanda_id = ? ORDER BY rotation_position ASC',
    );
    const rows = stmt.all(tandaId) as any[];

    return rows.map((row) => this.mapRowToParticipant(row));
  }

  findByUserAndTanda(userId: string, tandaId: string): Participant | null {
    const stmt = this.db.prepare(
      'SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?',
    );
    const row = stmt.get(userId, tandaId) as any;

    return row ? this.mapRowToParticipant(row) : null;
  }

  countByTandaId(tandaId: string): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM participants WHERE tanda_id = ?');
    const row = stmt.get(tandaId) as any;

    return row?.count || 0;
  }

  update(id: string, data: Partial<Omit<Participant, 'id' | 'createdAt'>>): Participant {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.role !== undefined) {
      updates.push('role = ?');
      values.push(data.role);
    }
    if (data.rotationPosition !== undefined) {
      updates.push('rotation_position = ?');
      values.push(data.rotationPosition);
    }

    if (updates.length === 0) {
      const updated = this.findById(id);
      if (!updated) {
        throw new Error(`Participant with id ${id} not found`);
      }
      return updated;
    }

    values.push(id);

    const stmt = this.db.prepare(`UPDATE participants SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    const updated = this.findById(id);
    if (!updated) {
      throw new Error(`Participant with id ${id} not found after update`);
    }

    return updated;
  }

  private mapRowToParticipant(row: any): Participant {
    return {
      id: row.id,
      userId: row.user_id,
      tandaId: row.tanda_id,
      role: row.role as ParticipantRole,
      rotationPosition: row.rotation_position,
      createdAt: new Date(row.created_at),
    };
  }
}
