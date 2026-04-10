import { db } from "../db/database";
import { CreateParticipantInput, Participant, ParticipantRole } from "../domain/models";

function mapParticipant(row: Record<string, unknown>): Participant {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    tandaId: Number(row.tanda_id),
    role: row.role as ParticipantRole,
    rotationPosition: row.rotation_position === null ? null : Number(row.rotation_position),
  };
}

export const participantRepository = {
  create(input: CreateParticipantInput): Participant {
    const insert = db.prepare(
      `INSERT INTO participants (user_id, tanda_id, role, rotation_position)
       VALUES (?, ?, ?, ?)`
    );
    const result = insert.run(input.userId, input.tandaId, input.role, input.rotationPosition);
    return this.findById(Number(result.lastInsertRowid)) as Participant;
  },

  findById(id: number): Participant | null {
    const row = db.prepare(`SELECT * FROM participants WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    return row ? mapParticipant(row) : null;
  },

  findByUserAndTanda(userId: number, tandaId: number): Participant | null {
    const row = db
      .prepare(`SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?`)
      .get(userId, tandaId) as Record<string, unknown> | undefined;
    return row ? mapParticipant(row) : null;
  },

  findByIdAndTanda(participantId: number, tandaId: number): Participant | null {
    const row = db
      .prepare(`SELECT * FROM participants WHERE id = ? AND tanda_id = ?`)
      .get(participantId, tandaId) as Record<string, unknown> | undefined;
    return row ? mapParticipant(row) : null;
  },

  listByTanda(tandaId: number): Participant[] {
    const rows = db
      .prepare(`SELECT * FROM participants WHERE tanda_id = ? ORDER BY id`)
      .all(tandaId) as Record<string, unknown>[];
    return rows.map(mapParticipant);
  },

  listByTandaOrdered(tandaId: number): Participant[] {
    const rows = db
      .prepare(
        `SELECT *
         FROM participants
         WHERE tanda_id = ?
         ORDER BY CASE WHEN rotation_position IS NULL THEN 1 ELSE 0 END, rotation_position, id`
      )
      .all(tandaId) as Record<string, unknown>[];
    return rows.map(mapParticipant);
  },

  countByTanda(tandaId: number): number {
    const row = db
      .prepare(`SELECT COUNT(*) as count FROM participants WHERE tanda_id = ?`)
      .get(tandaId) as { count: number };
    return row.count;
  },

  setRotationPositions(tandaId: number, participantIdsInOrder: number[]): void {
    const update = db.prepare(
      `UPDATE participants SET rotation_position = ? WHERE tanda_id = ? AND id = ?`
    );
    const tx = db.transaction((ids: number[]) => {
      ids.forEach((participantId, index) => {
        update.run(index + 1, tandaId, participantId);
      });
    });
    tx(participantIdsInOrder);
  },
};
