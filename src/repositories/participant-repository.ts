import { getDb } from "../db/database";
import type { Participant, ParticipantRole } from "../domain/models";

interface ParticipantRow {
  id: number;
  tanda_id: number;
  user_id: number;
  role: ParticipantRole;
  rotation_position: number | null;
  consecutive_misses: number;
  is_defaulter: number;
}

function toParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    userId: row.user_id,
    role: row.role,
    rotationPosition: row.rotation_position,
    consecutiveMisses: row.consecutive_misses,
    isDefaulter: row.is_defaulter === 1,
  };
}

/**
 * Repository for Participant persistence.
 */
export class ParticipantRepository {
  /**
   * Adds a user to a tanda with a given role.
   * @param tandaId - tanda to join
   * @param userId - user joining
   * @param role - organizer or member
   * @returns created Participant
   */
  create(tandaId: number, userId: number, role: ParticipantRole = "member"): Participant {
    const stmt = getDb().prepare(`
      INSERT INTO participants (tanda_id, user_id, role)
      VALUES (?, ?, ?) RETURNING *
    `);
    return toParticipant(stmt.get(tandaId, userId, role) as ParticipantRow);
  }

  /**
   * Finds a participant by primary key.
   * @param id - participant id
   * @returns Participant or null
   */
  findById(id: number): Participant | null {
    const row = getDb()
      .prepare("SELECT * FROM participants WHERE id = ?")
      .get(id) as ParticipantRow | undefined;
    return row ? toParticipant(row) : null;
  }

  /**
   * Finds a participant by tanda and user.
   * @param tandaId - tanda id
   * @param userId - user id
   * @returns Participant or null
   */
  findByTandaAndUser(tandaId: number, userId: number): Participant | null {
    const row = getDb()
      .prepare("SELECT * FROM participants WHERE tanda_id = ? AND user_id = ?")
      .get(tandaId, userId) as ParticipantRow | undefined;
    return row ? toParticipant(row) : null;
  }

  /**
   * Returns all participants for a given tanda, ordered by rotation position.
   * @param tandaId - tanda id
   * @returns Participant[]
   */
  findByTandaId(tandaId: number): Participant[] {
    return (
      getDb()
        .prepare("SELECT * FROM participants WHERE tanda_id = ? ORDER BY rotation_position ASC, id ASC")
        .all(tandaId) as ParticipantRow[]
    ).map(toParticipant);
  }

  /**
   * Updates rotation position, consecutive misses, and defaulter flag.
   * @param id - participant id
   * @param fields - fields to update
   * @returns updated Participant or null
   */
  update(
    id: number,
    fields: Partial<Pick<Participant, "rotationPosition" | "consecutiveMisses" | "isDefaulter">>,
  ): Participant | null {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.rotationPosition !== undefined) { sets.push("rotation_position = ?"); values.push(fields.rotationPosition); }
    if (fields.consecutiveMisses !== undefined) { sets.push("consecutive_misses = ?"); values.push(fields.consecutiveMisses); }
    if (fields.isDefaulter !== undefined) { sets.push("is_defaulter = ?"); values.push(fields.isDefaulter ? 1 : 0); }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    getDb().prepare(`UPDATE participants SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    return this.findById(id);
  }
}
