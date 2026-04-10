import { getDb } from "../db/database";
import { Participant, ParticipantRole } from "../types";

interface ParticipantRow {
  id: number;
  user_id: number;
  tanda_id: number;
  role: string;
  rotation_position: number | null;
}

function rowToParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role as ParticipantRole,
    rotationPosition: row.rotation_position,
  };
}

export const participantRepository = {
  create(userId: number, tandaId: number, role: ParticipantRole): Participant {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO participants (user_id, tanda_id, role) VALUES (?, ?, ?)",
    );
    const result = stmt.run(userId, tandaId, role);
    return {
      id: Number(result.lastInsertRowid),
      userId,
      tandaId,
      role,
      rotationPosition: null,
    };
  },

  findByTandaId(tandaId: number): Participant[] {
    const db = getDb();
    const stmt = db.prepare("SELECT * FROM participants WHERE tanda_id = ?");
    return (stmt.all(tandaId) as ParticipantRow[]).map(rowToParticipant);
  },

  findById(id: number): Participant | undefined {
    const db = getDb();
    const stmt = db.prepare("SELECT * FROM participants WHERE id = ?");
    const row = stmt.get(id) as ParticipantRow | undefined;
    return row ? rowToParticipant(row) : undefined;
  },

  findByUserAndTanda(userId: number, tandaId: number): Participant | undefined {
    const db = getDb();
    const stmt = db.prepare(
      "SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?",
    );
    const row = stmt.get(userId, tandaId) as ParticipantRow | undefined;
    return row ? rowToParticipant(row) : undefined;
  },

  countByTandaId(tandaId: number): number {
    const db = getDb();
    const stmt = db.prepare(
      "SELECT COUNT(*) as count FROM participants WHERE tanda_id = ?",
    );
    const row = stmt.get(tandaId) as { count: number };
    return row.count;
  },

  updateRotationPosition(id: number, position: number): void {
    const db = getDb();
    db.prepare(
      "UPDATE participants SET rotation_position = ? WHERE id = ?",
    ).run(position, id);
  },
};
