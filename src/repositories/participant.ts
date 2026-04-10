import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { NotFoundError, ValidationError } from '../errors';

export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: 'organizer' | 'member';
  rotationPosition: number | null;
  consecutiveMissed: number;
  isDefaulter: boolean;
  created_at: string;
}

export class ParticipantRepository {
  constructor(private db: Database.Database) {}

  create(userId: string, tandaId: string, role: 'organizer' | 'member'): Participant {
    const id = uuid();
    const now = new Date().toISOString();

    try {
      const result = this.db
        .prepare(
          `
          INSERT INTO participants (id, user_id, tanda_id, role, created_at)
          VALUES (?, ?, ?, ?, ?)
        `
        )
        .run(id, userId, tandaId, role, now);

      if (!result.changes) {
        throw new ValidationError('Failed to add participant');
      }

      return {
        id,
        userId,
        tandaId,
        role,
        rotationPosition: null,
        consecutiveMissed: 0,
        isDefaulter: false,
        created_at: now,
      };
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      if ((err.message as string)?.includes('UNIQUE constraint failed')) {
        throw new ValidationError('User is already a participant in this tanda', 'DUPLICATE_PARTICIPANT');
      }
      throw error;
    }
  }

  getById(id: string): Participant {
    const row = this.db
      .prepare(
        `
        SELECT id, user_id, tanda_id, role, rotation_position, consecutive_missed, is_defaulter, created_at
        FROM participants
        WHERE id = ?
      `
      )
      .get(id) as Record<string, unknown>;

    if (!row) {
      throw new NotFoundError('Participant', id);
    }

    return this.normalizeParticipant(row);
  }

  getByTanda(tandaId: string): Participant[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, user_id, tanda_id, role, rotation_position, consecutive_missed, is_defaulter, created_at
        FROM participants
        WHERE tanda_id = ?
        ORDER BY rotation_position IS NULL, rotation_position ASC, created_at ASC
      `
      )
      .all(tandaId) as Record<string, unknown>[];

    return rows.map((row) => this.normalizeParticipant(row));
  }

  getByUserAndTanda(userId: string, tandaId: string): Participant | null {
    const row = this.db
      .prepare(
        `
        SELECT id, user_id, tanda_id, role, rotation_position, consecutive_missed, is_defaulter, created_at
        FROM participants
        WHERE user_id = ? AND tanda_id = ?
      `
      )
      .get(userId, tandaId) as Record<string, unknown>;

    return row ? this.normalizeParticipant(row) : null;
  }

  updateRotationOrder(tandaId: string, participantIds: string[]): void {
    const stmt = this.db.prepare(
      `
      UPDATE participants
      SET rotation_position = ?
      WHERE id = ? AND tanda_id = ?
    `
    );

    const transaction = this.db.transaction(() => {
      participantIds.forEach((id, index) => {
        stmt.run(index, id, tandaId);
      });
    });

    transaction();
  }

  markAsDefaulter(participantId: string): void {
    const result = this.db
      .prepare(
        `
        UPDATE participants
        SET is_defaulter = 1
        WHERE id = ?
      `
      )
      .run(participantId);

    if (!result.changes) {
      throw new NotFoundError('Participant', participantId);
    }
  }

  resetConsecutiveMissed(participantId: string): void {
    const result = this.db
      .prepare(
        `
        UPDATE participants
        SET consecutive_missed = 0
        WHERE id = ?
      `
      )
      .run(participantId);

    if (!result.changes) {
      throw new NotFoundError('Participant', participantId);
    }
  }

  incrementConsecutiveMissed(participantId: string): void {
    const result = this.db
      .prepare(
        `
        UPDATE participants
        SET consecutive_missed = consecutive_missed + 1
        WHERE id = ?
      `
      )
      .run(participantId);

    if (!result.changes) {
      throw new NotFoundError('Participant', participantId);
    }
  }

  private normalizeParticipant(row: Record<string, unknown>): Participant {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      tandaId: row.tanda_id as string,
      role: row.role as 'organizer' | 'member',
      rotationPosition: row.rotation_position as number | null,
      consecutiveMissed: row.consecutive_missed as number,
      isDefaulter: row.is_defaulter === 1,
      created_at: row.created_at as string,
    };
  }
}
