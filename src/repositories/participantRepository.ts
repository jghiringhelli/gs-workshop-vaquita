import { v4 as uuidv4 } from "uuid";
import { db } from "../db/database";

export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: "organizer" | "member";
  rotationPosition: number | null;
  isDefaulter: number; // 0 | 1 (SQLite boolean)
}

export const participantRepository = {
  create(data: {
    userId: string;
    tandaId: string;
    role: "organizer" | "member";
  }): Participant {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO participants (id, userId, tandaId, role, rotationPosition, isDefaulter)
       VALUES (?, ?, ?, ?, NULL, 0)`,
    ).run(id, data.userId, data.tandaId, data.role);
    return { id, ...data, rotationPosition: null, isDefaulter: 0 };
  },

  findById(id: string): Participant | undefined {
    return db
      .prepare("SELECT * FROM participants WHERE id = ?")
      .get(id) as Participant | undefined;
  },

  findByTandaId(tandaId: string): Participant[] {
    return db
      .prepare("SELECT * FROM participants WHERE tandaId = ? ORDER BY rotationPosition ASC")
      .all(tandaId) as Participant[];
  },

  findByUserAndTanda(
    userId: string,
    tandaId: string,
  ): Participant | undefined {
    return db
      .prepare(
        "SELECT * FROM participants WHERE userId = ? AND tandaId = ?",
      )
      .get(userId, tandaId) as Participant | undefined;
  },

  countByTandaId(tandaId: string): number {
    const row = db
      .prepare("SELECT COUNT(*) as count FROM participants WHERE tandaId = ?")
      .get(tandaId) as { count: number };
    return row.count;
  },

  updateRotationPosition(id: string, position: number): void {
    db.prepare(
      "UPDATE participants SET rotationPosition = ? WHERE id = ?",
    ).run(position, id);
  },

  markAsDefaulter(id: string): void {
    db.prepare("UPDATE participants SET isDefaulter = 1 WHERE id = ?").run(id);
  },
};
