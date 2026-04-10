import Database from "better-sqlite3";
import { Contribution, ContributionStatus } from "../domain/types";

export interface CreateContributionInput {
  tandaId: number;
  participantId: number;
  round: number;
  amount: number;
  status: ContributionStatus;
  penaltyAmount: number;
  idempotencyKey: string | null;
}

export interface ContributionRepository {
  create(input: CreateContributionInput): Contribution;
  listByParticipant(participantId: number): Contribution[];
  listByTandaAndRound(tandaId: number, round: number): Contribution[];
  findByRoundAndParticipant(tandaId: number, round: number, participantId: number): Contribution | null;
  findByIdempotencyKey(key: string): Contribution | null;
}

export class SqliteContributionRepository implements ContributionRepository {
  public constructor(private readonly database: Database.Database) {}

  /**
   * Creates a contribution row.
   * @param input Contribution payload.
   * @returns Created contribution.
   */
  public create(input: CreateContributionInput): Contribution {
    const result = this.database
      .prepare(
        `INSERT INTO contributions (
           tanda_id,
           participant_id,
           round,
           amount,
           status,
           penalty_amount,
           idempotency_key,
           created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.tandaId,
        input.participantId,
        input.round,
        input.amount,
        input.status,
        input.penaltyAmount,
        input.idempotencyKey,
        new Date().toISOString(),
      );

    const row = this.database
      .prepare(
        `SELECT
           id,
           tanda_id AS tandaId,
           participant_id AS participantId,
           round,
           amount,
           status,
           penalty_amount AS penaltyAmount,
           idempotency_key AS idempotencyKey
         FROM contributions
         WHERE id = ?`
      )
      .get(Number(result.lastInsertRowid)) as Contribution;
    return row;
  }

  /**
   * Lists contribution history by participant.
   * @param participantId Participant identifier.
   * @returns Contribution list.
   */
  public listByParticipant(participantId: number): Contribution[] {
    const rows = this.database
      .prepare(
        `SELECT
           id,
           tanda_id AS tandaId,
           participant_id AS participantId,
           round,
           amount,
           status,
           penalty_amount AS penaltyAmount,
           idempotency_key AS idempotencyKey
         FROM contributions
         WHERE participant_id = ?
         ORDER BY round ASC, id ASC`
      )
      .all(participantId) as Contribution[];
    return rows;
  }

  /**
   * Lists contributions in one tanda round.
   * @param tandaId Tanda identifier.
   * @param round Round number.
   * @returns Contribution rows.
   */
  public listByTandaAndRound(tandaId: number, round: number): Contribution[] {
    const rows = this.database
      .prepare(
        `SELECT
           id,
           tanda_id AS tandaId,
           participant_id AS participantId,
           round,
           amount,
           status,
           penalty_amount AS penaltyAmount,
           idempotency_key AS idempotencyKey
         FROM contributions
         WHERE tanda_id = ? AND round = ?
         ORDER BY id ASC`
      )
      .all(tandaId, round) as Contribution[];
    return rows;
  }

  /**
   * Finds participant contribution in one round.
   * @param tandaId Tanda identifier.
   * @param round Round number.
   * @param participantId Participant identifier.
   * @returns Contribution or null.
   */
  public findByRoundAndParticipant(
    tandaId: number,
    round: number,
    participantId: number,
  ): Contribution | null {
    const row = this.database
      .prepare(
        `SELECT
           id,
           tanda_id AS tandaId,
           participant_id AS participantId,
           round,
           amount,
           status,
           penalty_amount AS penaltyAmount,
           idempotency_key AS idempotencyKey
         FROM contributions
         WHERE tanda_id = ? AND round = ? AND participant_id = ?
         ORDER BY id DESC LIMIT 1`
      )
      .get(tandaId, round, participantId) as Contribution | undefined;
    return row ?? null;
  }

  /**
   * Finds a contribution by idempotency key.
   * @param key Idempotency key.
   * @returns Contribution or null.
   */
  public findByIdempotencyKey(key: string): Contribution | null {
    const row = this.database
      .prepare(
        `SELECT
           id,
           tanda_id AS tandaId,
           participant_id AS participantId,
           round,
           amount,
           status,
           penalty_amount AS penaltyAmount,
           idempotency_key AS idempotencyKey
         FROM contributions
         WHERE idempotency_key = ?`
      )
      .get(key) as Contribution | undefined;
    return row ?? null;
  }
}
