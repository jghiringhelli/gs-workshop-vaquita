import type Database from "better-sqlite3";

import { AppError, NotImplementedAppError } from "../../lib/errors";
import type {
  CreateTandaInput,
  JoinTandaInput,
  RecordContributionInput,
  Tanda,
  TandaParticipant,
} from "./tandas.types";

interface TandaRow {
  readonly id: number;
  readonly name: string;
  readonly organizer_id: number;
  readonly contribution_amount: number;
  readonly status: "forming" | "active" | "completed" | "cancelled";
  readonly current_round: number;
  readonly total_rounds: number;
  readonly created_at: string;
}

interface ParticipantRow {
  readonly id: number;
  readonly user_id: number;
  readonly tanda_id: number;
  readonly role: "organizer" | "member";
  readonly rotation_position: number | null;
  readonly created_at: string;
}

export interface TandaRepository {
  create(input: CreateTandaInput): Tanda;
  findById(id: number): Tanda | null;
  listByUserId(userId: number): ReadonlyArray<Tanda>;
  listParticipants(tandaId: number): ReadonlyArray<TandaParticipant>;
  join(input: JoinTandaInput): TandaParticipant;
  recordContribution(input: RecordContributionInput): void;
}

export class SqliteTandaRepository implements TandaRepository {
  public constructor(private readonly database: Database.Database) {}

  /**
   * Creates a tanda record in SQLite.
   * @param input Tanda creation payload.
   * @returns Persisted tanda.
   */
  public create(input: CreateTandaInput): Tanda {
    const transaction = this.database.transaction((payload: CreateTandaInput): Tanda => {
      const result = this.database
        .prepare(
          `INSERT INTO tandas (
            name,
            organizer_id,
            contribution_amount,
            status,
            current_round,
            total_rounds
          ) VALUES (?, ?, ?, 'forming', 0, 0)`,
        )
        .run(payload.name, payload.organizerId, payload.contributionAmount);

      const tandaId = Number(result.lastInsertRowid);

      this.database
        .prepare(
          `INSERT INTO participants (user_id, tanda_id, role, rotation_position)
           VALUES (?, ?, 'organizer', NULL)`,
        )
        .run(payload.organizerId, tandaId);

      const tanda = this.findById(tandaId);
      if (!tanda) {
        throw new AppError("Failed to reload persisted tanda.", 500, "PERSISTENCE_ERROR");
      }

      return tanda;
    });

    return transaction(input);
  }

  /**
   * Finds a tanda by its identifier.
   * @param id Tanda identifier.
   * @returns Matching tanda or null.
   */
  public findById(id: number): Tanda | null {
    const row = this.database
      .prepare(
        `SELECT id, name, organizer_id, contribution_amount, status, current_round, total_rounds, created_at
         FROM tandas
         WHERE id = ?`,
      )
      .get(id) as TandaRow | undefined;

    return row ? mapTandaRow(row) : null;
  }

  /**
   * Lists tandas visible to a user.
   * @param userId User identifier.
   * @returns Tandas associated with the user.
   */
  public listByUserId(userId: number): ReadonlyArray<Tanda> {
    const rows = this.database
      .prepare(
        `SELECT DISTINCT
           t.id,
           t.name,
           t.organizer_id,
           t.contribution_amount,
           t.status,
           t.current_round,
           t.total_rounds,
           t.created_at
         FROM tandas t
         INNER JOIN participants p ON p.tanda_id = t.id
         WHERE p.user_id = ?
         ORDER BY t.id ASC`,
      )
      .all(userId) as ReadonlyArray<TandaRow>;

    return rows.map(mapTandaRow);
  }

  /**
   * Lists tanda participants.
   * @param tandaId Tanda identifier.
   * @returns Participants for the tanda.
   */
  public listParticipants(tandaId: number): ReadonlyArray<TandaParticipant> {
    const rows = this.database
      .prepare(
        `SELECT id, user_id, tanda_id, role, rotation_position, created_at
         FROM participants
         WHERE tanda_id = ?
         ORDER BY id ASC`,
      )
      .all(tandaId) as ReadonlyArray<ParticipantRow>;

    return rows.map(mapParticipantRow);
  }

  /**
   * Adds a participant to a tanda.
   * @param input Join request payload.
   * @returns Persisted participant record.
   */
  public join(input: JoinTandaInput): TandaParticipant {
    const result = this.database
      .prepare(
        `INSERT INTO participants (user_id, tanda_id, role, rotation_position)
         VALUES (?, ?, 'member', NULL)`,
      )
      .run(input.userId, input.tandaId);

    const participant = this.database
      .prepare(
        `SELECT id, user_id, tanda_id, role, rotation_position, created_at
         FROM participants
         WHERE id = ?`,
      )
      .get(Number(result.lastInsertRowid)) as ParticipantRow | undefined;

    if (!participant) {
      throw new AppError("Failed to reload persisted participant.", 500, "PERSISTENCE_ERROR");
    }

    return mapParticipantRow(participant);
  }

  /**
   * Records a contribution for a participant in the active round.
   * @param _input Contribution payload.
   * @returns Nothing.
   */
  public recordContribution(_input: RecordContributionInput): void {
    throw new NotImplementedAppError(
      "SqliteTandaRepository.recordContribution is not implemented yet.",
    );
  }
}

function mapTandaRow(row: TandaRow): Tanda {
  return {
    id: row.id,
    name: row.name,
    organizerId: row.organizer_id,
    contributionAmount: row.contribution_amount,
    status: row.status,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
    createdAt: row.created_at,
  };
}

function mapParticipantRow(row: ParticipantRow): TandaParticipant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role,
    rotationPosition: row.rotation_position,
    createdAt: row.created_at,
  };
}