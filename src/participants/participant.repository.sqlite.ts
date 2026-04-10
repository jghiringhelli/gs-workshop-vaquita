import type Database from "better-sqlite3";
import type { IParticipantRepository } from "./participant.repository.js";
import type { Participant, ParticipantRole } from "./participant.types.js";

interface ParticipantRow {
  id: string;
  user_id: string;
  tanda_id: string;
  role: ParticipantRole;
  rotation_position: number | null;
  consecutive_misses: number;
  created_at: string;
}

/** SQLite implementation of IParticipantRepository. */
export class SqliteParticipantRepository implements IParticipantRepository {
  constructor(private readonly db: Database.Database) {}

  /** @inheritdoc */
  create(participant: Participant): Participant {
    this.db
      .prepare(
        `INSERT INTO participants (id, user_id, tanda_id, role, rotation_position, consecutive_misses, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        participant.id,
        participant.userId,
        participant.tandaId,
        participant.role,
        participant.rotationPosition,
        participant.consecutiveMisses,
        participant.createdAt
      );
    return participant;
  }

  /** @inheritdoc */
  findByTandaId(tandaId: string): Participant[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM participants WHERE tanda_id = ?
         ORDER BY COALESCE(rotation_position, 999), created_at ASC`
      )
      .all(tandaId) as ParticipantRow[];
    return rows.map((r) => this.toEntity(r));
  }

  /** @inheritdoc */
  findByUserAndTanda(userId: string, tandaId: string): Participant | null {
    const row = this.db
      .prepare("SELECT * FROM participants WHERE user_id = ? AND tanda_id = ?")
      .get(userId, tandaId) as ParticipantRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  /** @inheritdoc */
  findById(id: string): Participant | null {
    const row = this.db
      .prepare("SELECT * FROM participants WHERE id = ?")
      .get(id) as ParticipantRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  /** @inheritdoc */
  assignRotationPositions(tandaId: string, positions: Map<string, number>): void {
    const stmt = this.db.prepare(
      "UPDATE participants SET rotation_position = ? WHERE id = ? AND tanda_id = ?"
    );
    const updateAll = this.db.transaction(() => {
      for (const [participantId, position] of positions) {
        stmt.run(position, participantId, tandaId);
      }
    });
    updateAll();
  }

  /** @inheritdoc */
  updateConsecutiveMisses(participantId: string, count: number): void {
    this.db
      .prepare("UPDATE participants SET consecutive_misses = ? WHERE id = ?")
      .run(count, participantId);
  }

  private toEntity(row: ParticipantRow): Participant {
    return {
      id: row.id,
      userId: row.user_id,
      tandaId: row.tanda_id,
      role: row.role,
      rotationPosition: row.rotation_position,
      consecutiveMisses: row.consecutive_misses,
      createdAt: row.created_at,
    };
  }
}
