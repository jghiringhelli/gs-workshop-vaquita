import Database from "better-sqlite3";
import { Tanda, TandaStatus } from "../domain/types";

export interface CreateTandaInput {
  name: string;
  organizerId: number;
  contributionAmount: number;
}

export interface UpdateTandaLifecycleInput {
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
  roundStartedAt: string | null;
}

export interface TandaRepository {
  create(input: CreateTandaInput): Tanda;
  findById(id: number): Tanda | null;
  listByUserId(userId: number): Tanda[];
  updateLifecycle(tandaId: number, input: UpdateTandaLifecycleInput): void;
}

export class SqliteTandaRepository implements TandaRepository {
  public constructor(private readonly database: Database.Database) {}

  /**
   * Creates a tanda.
   * @param input Tanda creation payload.
   * @returns Created tanda.
   */
  public create(input: CreateTandaInput): Tanda {
    const result = this.database
      .prepare(
        `INSERT INTO tandas (
           name,
           organizer_id,
           contribution_amount,
           status,
           current_round,
           total_rounds,
           round_started_at,
           created_at
         ) VALUES (?, ?, ?, 'forming', 0, 0, NULL, ?)`
      )
      .run(input.name, input.organizerId, input.contributionAmount, new Date().toISOString());
    return this.findById(Number(result.lastInsertRowid)) as Tanda;
  }

  /**
   * Finds tanda by identifier.
   * @param id Tanda identifier.
   * @returns Tanda or null.
   */
  public findById(id: number): Tanda | null {
    const row = this.database
      .prepare(
        `SELECT
           id,
           name,
           organizer_id AS organizerId,
           contribution_amount AS contributionAmount,
           status,
           current_round AS currentRound,
           total_rounds AS totalRounds,
           round_started_at AS roundStartedAt
         FROM tandas
         WHERE id = ?`
      )
      .get(id) as Tanda | undefined;
    return row ?? null;
  }

  /**
   * Lists tandas where the given user participates.
   * @param userId User identifier.
   * @returns Tanda list.
   */
  public listByUserId(userId: number): Tanda[] {
    const rows = this.database
      .prepare(
        `SELECT
           t.id,
           t.name,
           t.organizer_id AS organizerId,
           t.contribution_amount AS contributionAmount,
           t.status,
           t.current_round AS currentRound,
           t.total_rounds AS totalRounds,
           t.round_started_at AS roundStartedAt
         FROM tandas t
         INNER JOIN participants p ON p.tanda_id = t.id
         WHERE p.user_id = ?
         ORDER BY t.id ASC`
      )
      .all(userId) as Tanda[];
    return rows;
  }

  /**
   * Updates tanda lifecycle fields.
   * @param tandaId Tanda identifier.
   * @param input Lifecycle update payload.
   * @returns Nothing.
   */
  public updateLifecycle(tandaId: number, input: UpdateTandaLifecycleInput): void {
    this.database
      .prepare(
        `UPDATE tandas
         SET status = ?, current_round = ?, total_rounds = ?, round_started_at = ?
         WHERE id = ?`
      )
      .run(input.status, input.currentRound, input.totalRounds, input.roundStartedAt, tandaId);
  }
}
