import Database from 'better-sqlite3';
import { Participant, ParticipantRole } from '../models/types';
import { NotFoundError, ConflictError } from '../errors/customErrors';

export class ParticipantRepository {
  constructor(private db: Database.Database) {}

  create(userId: number, tandaId: number, role: ParticipantRole): Participant {
    const stmt = this.db.prepare(`
      INSERT INTO participants (user_id, tanda_id, role, rotation_position)
      VALUES (?, ?, ?, NULL)
    `);

    try {
      const result = stmt.run(userId, tandaId, role);
      return this.findById(result.lastInsertRowid as number)!;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new ConflictError(`User ${userId} has already joined tanda ${tandaId}`);
      }
      throw error;
    }
  }

  findById(id: number): Participant | null {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        user_id as userId,
        tanda_id as tandaId,
        role,
        rotation_position as rotationPosition,
        joined_at as joinedAt
      FROM participants
      WHERE id = ?
    `);

    const row = stmt.get(id) as Participant | undefined;
    return row || null;
  }

  findByTandaId(tandaId: number): Participant[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        user_id as userId,
        tanda_id as tandaId,
        role,
        rotation_position as rotationPosition,
        joined_at as joinedAt
      FROM participants
      WHERE tanda_id = ?
      ORDER BY rotation_position NULLS LAST, id
    `);

    return stmt.all(tandaId) as Participant[];
  }

  findByTandaAndUser(tandaId: number, userId: number): Participant | null {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        user_id as userId,
        tanda_id as tandaId,
        role,
        rotation_position as rotationPosition,
        joined_at as joinedAt
      FROM participants
      WHERE tanda_id = ? AND user_id = ?
    `);

    const row = stmt.get(tandaId, userId) as Participant | undefined;
    return row || null;
  }

  countByTandaId(tandaId: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM participants
      WHERE tanda_id = ?
    `);

    const result = stmt.get(tandaId) as { count: number };
    return result.count;
  }

  assignRotationPositions(tandaId: number, positions: Map<number, number>): void {
    const stmt = this.db.prepare(`
      UPDATE participants
      SET rotation_position = ?
      WHERE id = ?
    `);

    const transaction = this.db.transaction(() => {
      positions.forEach((position, participantId) => {
        stmt.run(position, participantId);
      });
    });

    transaction();
  }

  getRecipientForRound(tandaId: number, round: number): Participant | null {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        user_id as userId,
        tanda_id as tandaId,
        role,
        rotation_position as rotationPosition,
        joined_at as joinedAt
      FROM participants
      WHERE tanda_id = ? AND rotation_position = ?
    `);

    const row = stmt.get(tandaId, round) as Participant | undefined;
    return row || null;
  }
}
