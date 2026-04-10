import type { Participant, ParticipantRole } from "../domain/models";
import { getDatabase } from "../db/database";

interface ParticipantRow {
  id: number;
  user_id: number;
  tanda_id: number;
  role: ParticipantRole;
  rotation_position: number | null;
  is_defaulter: number;
}

function toParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role,
    rotationPosition: row.rotation_position,
    isDefaulter: row.is_defaulter === 1,
  };
}

export class ParticipantRepository {
  create(input: {
    userId: number;
    tandaId: number;
    role: ParticipantRole;
    rotationPosition?: number | null;
  }): Participant {
    const db = getDatabase();
    const stmt = db.prepare(
      `INSERT INTO participants (user_id, tanda_id, role, rotation_position, is_defaulter)
       VALUES (?, ?, ?, ?, 0)
       RETURNING id, user_id, tanda_id, role, rotation_position, is_defaulter`
    );

    const row = stmt.get(
      input.userId,
      input.tandaId,
      input.role,
      input.rotationPosition ?? null
    ) as ParticipantRow;

    return toParticipant(row);
  }

  listByTanda(tandaId: number): Participant[] {
    const db = getDatabase();
    const stmt = db.prepare(
      `SELECT id, user_id, tanda_id, role, rotation_position, is_defaulter
       FROM participants
       WHERE tanda_id = ?
       ORDER BY id ASC`
    );
    const rows = stmt.all(tandaId) as ParticipantRow[];
    return rows.map(toParticipant);
  }

  findById(id: number): Participant | null {
    const db = getDatabase();
    const stmt = db.prepare(
      "SELECT id, user_id, tanda_id, role, rotation_position, is_defaulter FROM participants WHERE id = ?"
    );
    const row = stmt.get(id) as ParticipantRow | undefined;
    return row ? toParticipant(row) : null;
  }

  countByTanda(tandaId: number): number {
    const db = getDatabase();
    const stmt = db.prepare(
      "SELECT COUNT(*) as total FROM participants WHERE tanda_id = ?"
    );
    const row = stmt.get(tandaId) as { total: number };
    return row.total;
  }

  setDefaulter(id: number, isDefaulter: boolean): void {
    const db = getDatabase();
    const stmt = db.prepare(
      "UPDATE participants SET is_defaulter = ? WHERE id = ?"
    );
    stmt.run(isDefaulter ? 1 : 0, id);
  }

  updateRotationPosition(id: number, rotationPosition: number): void {
    const db = getDatabase();
    const stmt = db.prepare(
      "UPDATE participants SET rotation_position = ? WHERE id = ?"
    );
    stmt.run(rotationPosition, id);
  }
}
