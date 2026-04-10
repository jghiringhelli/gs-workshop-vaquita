import { getDb } from "../db/database.js";

export interface ParticipantRow {
  id: number;
  user_id: number;
  tanda_id: number;
  role: "organizer" | "member";
  rotation_position: number | null;
  is_defaulter: number;
  created_at: string;
}

export const participantRepository = {
  create(
    userId: number,
    tandaId: number,
    role: "organizer" | "member"
  ): ParticipantRow {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO participants (user_id, tanda_id, role) VALUES (?, ?, ?)"
    );
    const result = stmt.run(userId, tandaId, role);
    return this.findById(result.lastInsertRowid as number)!;
  },

  findById(id: number): ParticipantRow | undefined {
    const db = getDb();
    return db.prepare("SELECT * FROM participants WHERE id = ?").get(id) as
      | ParticipantRow
      | undefined;
  },

  findByTandaId(tandaId: number): ParticipantRow[] {
    const db = getDb();
    return db
      .prepare("SELECT * FROM participants WHERE tanda_id = ?")
      .all(tandaId) as ParticipantRow[];
  },

  findByUserAndTanda(
    userId: number,
    tandaId: number
  ): ParticipantRow | undefined {
    const db = getDb();
    return db
      .prepare(
        "SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?"
      )
      .get(userId, tandaId) as ParticipantRow | undefined;
  },

  countByTanda(tandaId: number): number {
    const db = getDb();
    const row = db
      .prepare("SELECT COUNT(*) as count FROM participants WHERE tanda_id = ?")
      .get(tandaId) as { count: number };
    return row.count;
  },

  updateRotationPosition(id: number, position: number): void {
    const db = getDb();
    db.prepare(
      "UPDATE participants SET rotation_position = ? WHERE id = ?"
    ).run(position, id);
  },

  markAsDefaulter(id: number): void {
    const db = getDb();
    db.prepare(
      "UPDATE participants SET is_defaulter = 1 WHERE id = ?"
    ).run(id);
  },

  findByRotationPosition(
    tandaId: number,
    position: number
  ): ParticipantRow | undefined {
    const db = getDb();
    return db
      .prepare(
        "SELECT * FROM participants WHERE tanda_id = ? AND rotation_position = ?"
      )
      .get(tandaId, position) as ParticipantRow | undefined;
  },
};
