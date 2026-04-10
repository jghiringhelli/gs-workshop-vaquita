import Database from "better-sqlite3";
import { Participant, ParticipantRole } from "../domain/types";

export interface CreateParticipantInput {
  userId: number;
  tandaId: number;
  role: ParticipantRole;
}

export interface ParticipantRepository {
  create(input: CreateParticipantInput): Participant;
  listByTandaId(tandaId: number): Participant[];
  findByTandaAndUser(tandaId: number, userId: number): Participant | null;
  assignRotationPosition(participantId: number, position: number): void;
  updateMissedState(participantId: number, missedStreak: number, isDefaulter: boolean): void;
  findById(participantId: number): Participant | null;
}

export class SqliteParticipantRepository implements ParticipantRepository {
  public constructor(private readonly database: Database.Database) {}

  /**
   * Creates a participant for a tanda.
   * @param input Participant payload.
   * @returns Created participant.
   */
  public create(input: CreateParticipantInput): Participant {
    const result = this.database
      .prepare(
        `INSERT INTO participants (user_id, tanda_id, role, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(input.userId, input.tandaId, input.role, new Date().toISOString());
    return this.findById(Number(result.lastInsertRowid)) as Participant;
  }

  /**
   * Lists participants for one tanda.
   * @param tandaId Tanda identifier.
   * @returns Participants list.
   */
  public listByTandaId(tandaId: number): Participant[] {
    const rows = this.database
      .prepare(
        `SELECT
           id,
           user_id AS userId,
           tanda_id AS tandaId,
           role,
           rotation_position AS rotationPosition,
           missed_streak AS missedStreak,
           is_defaulter AS isDefaulter
         FROM participants
         WHERE tanda_id = ?
         ORDER BY id ASC`
      )
      .all(tandaId) as Array<Participant & { isDefaulter: number | boolean }>;
    return rows.map((participant) => ({
      ...participant,
      isDefaulter: Boolean(participant.isDefaulter),
    }));
  }

  /**
   * Finds participant by tanda and user.
   * @param tandaId Tanda identifier.
   * @param userId User identifier.
   * @returns Participant or null.
   */
  public findByTandaAndUser(tandaId: number, userId: number): Participant | null {
    const row = this.database
      .prepare(
        `SELECT
           id,
           user_id AS userId,
           tanda_id AS tandaId,
           role,
           rotation_position AS rotationPosition,
           missed_streak AS missedStreak,
           is_defaulter AS isDefaulter
         FROM participants
         WHERE tanda_id = ? AND user_id = ?`
      )
      .get(tandaId, userId) as (Participant & { isDefaulter: number | boolean }) | undefined;
    if (!row) {
      return null;
    }

    return {
      ...row,
      isDefaulter: Boolean(row.isDefaulter),
    };
  }

  /**
   * Assigns rotation position to participant.
   * @param participantId Participant identifier.
   * @param position Rotation position.
   * @returns Nothing.
   */
  public assignRotationPosition(participantId: number, position: number): void {
    this.database
      .prepare(`UPDATE participants SET rotation_position = ? WHERE id = ?`)
      .run(position, participantId);
  }

  /**
   * Updates participant missed streak and defaulter flag.
   * @param participantId Participant identifier.
   * @param missedStreak Current missed streak.
   * @param isDefaulter Whether participant is flagged.
   * @returns Nothing.
   */
  public updateMissedState(participantId: number, missedStreak: number, isDefaulter: boolean): void {
    this.database
      .prepare(`UPDATE participants SET missed_streak = ?, is_defaulter = ? WHERE id = ?`)
      .run(missedStreak, Number(isDefaulter), participantId);
  }

  /**
   * Finds participant by identifier.
   * @param participantId Participant identifier.
   * @returns Participant or null.
   */
  public findById(participantId: number): Participant | null {
    const row = this.database
      .prepare(
        `SELECT
           id,
           user_id AS userId,
           tanda_id AS tandaId,
           role,
           rotation_position AS rotationPosition,
           missed_streak AS missedStreak,
           is_defaulter AS isDefaulter
         FROM participants
         WHERE id = ?`
      )
      .get(participantId) as (Participant & { isDefaulter: number | boolean }) | undefined;
    if (!row) {
      return null;
    }

    return {
      ...row,
      isDefaulter: Boolean(row.isDefaulter),
    };
  }
}
