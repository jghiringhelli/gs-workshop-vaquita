import type Database from "better-sqlite3";

import type {
  Contribution,
  Participant,
  ParticipantRole,
  Tanda,
  TandaStatus,
} from "../domain/TandaModels";
import type {
  CreateContributionRecord,
  CreateParticipantRecord,
  CreateTandaRecord,
  RotationAssignment,
  TandaRepository,
} from "../domain/TandaRepository";

interface TandaRow {
  readonly id: number;
  readonly name: string;
  readonly organizer_user_id: number;
  readonly contribution_amount: number;
  readonly status: TandaStatus;
  readonly current_round: number;
  readonly total_rounds: number;
  readonly participant_count: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly started_at: string | null;
  readonly round_started_at: string | null;
  readonly completed_at: string | null;
  readonly cancelled_at: string | null;
}

interface ParticipantRow {
  readonly id: number;
  readonly user_id: number;
  readonly tanda_id: number;
  readonly role: ParticipantRole;
  readonly rotation_position: number | null;
  readonly is_defaulter: number;
  readonly joined_at: string;
  readonly email: string;
  readonly name: string;
}

interface ContributionRow {
  readonly id: number;
  readonly tanda_id: number;
  readonly participant_id: number;
  readonly round: number;
  readonly amount: number;
  readonly status: "paid" | "late" | "missed";
  readonly penalty_amount: number;
  readonly recorded_at: string;
  readonly user_id: number;
  readonly role: ParticipantRole;
  readonly rotation_position: number | null;
  readonly is_defaulter: number;
  readonly joined_at: string;
  readonly email: string;
  readonly name: string;
}

function mapTandaRow(row: TandaRow): Tanda {
  return {
    id: row.id,
    name: row.name,
    organizerId: row.organizer_user_id,
    contributionAmount: row.contribution_amount,
    status: row.status,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
    participantCount: row.participant_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    roundStartedAt: row.round_started_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
  };
}

function mapParticipantRow(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role,
    rotationPosition: row.rotation_position,
    isDefaulter: row.is_defaulter === 1,
    joinedAt: row.joined_at,
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
    },
  };
}

function mapContributionRow(row: ContributionRow): Contribution {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    amount: row.amount,
    status: row.status,
    penaltyAmount: row.penalty_amount,
    recordedAt: row.recorded_at,
    participant: {
      id: row.participant_id,
      userId: row.user_id,
      tandaId: row.tanda_id,
      role: row.role,
      rotationPosition: row.rotation_position,
      isDefaulter: row.is_defaulter === 1,
      joinedAt: row.joined_at,
      user: {
        id: row.user_id,
        email: row.email,
        name: row.name,
      },
    },
  };
}

/**
 * Persist and query tanda data from SQLite.
 */
export class SqliteTandaRepository implements TandaRepository {
  public constructor(private readonly database: Database.Database) {}

  /**
   * Create a tanda record.
   *
   * @param input The tanda input to persist.
   * @returns The created tanda.
   */
  public createTanda(input: CreateTandaRecord): Tanda {
    const result = this.database
      .prepare(
        `
          INSERT INTO tandas (
            name,
            organizer_user_id,
            contribution_amount,
            status,
            current_round,
            total_rounds,
            created_at,
            updated_at
          )
          VALUES (
            @name,
            @organizerId,
            @contributionAmount,
            'forming',
            0,
            @totalRounds,
            @now,
            @now
          )
        `,
      )
      .run({
        name: input.name,
        organizerId: input.organizerId,
        contributionAmount: input.contributionAmount,
        totalRounds: input.totalRounds,
        now: input.now,
      });

    return this.getTandaById(Number(result.lastInsertRowid)) as Tanda;
  }

  /**
   * Return the tandas that belong to a user.
   *
   * @param userId The user identifier.
   * @returns The matching tandas.
   */
  public listTandasForUser(userId: number): readonly Tanda[] {
    const rows = this.database
      .prepare<[number], TandaRow>(
        `
          SELECT
            t.id,
            t.name,
            t.organizer_user_id,
            t.contribution_amount,
            t.status,
            t.current_round,
            t.total_rounds,
            t.created_at,
            t.updated_at,
            t.started_at,
            t.round_started_at,
            t.completed_at,
            t.cancelled_at,
            (
              SELECT COUNT(*)
              FROM participants participant_count
              WHERE participant_count.tanda_id = t.id
            ) AS participant_count
          FROM tandas t
          WHERE EXISTS (
            SELECT 1
            FROM participants visible_participant
            WHERE visible_participant.tanda_id = t.id
              AND visible_participant.user_id = ?
          )
          ORDER BY t.id ASC
        `,
      )
      .all(userId);

    return rows.map(mapTandaRow);
  }

  /**
   * Return a tanda by identifier.
   *
   * @param tandaId The tanda identifier.
   * @returns The matching tanda when found, otherwise null.
   */
  public getTandaById(tandaId: number): Tanda | null {
    const row = this.database
      .prepare<[number], TandaRow>(
        `
          SELECT
            t.id,
            t.name,
            t.organizer_user_id,
            t.contribution_amount,
            t.status,
            t.current_round,
            t.total_rounds,
            t.created_at,
            t.updated_at,
            t.started_at,
            t.round_started_at,
            t.completed_at,
            t.cancelled_at,
            (
              SELECT COUNT(*)
              FROM participants participant_count
              WHERE participant_count.tanda_id = t.id
            ) AS participant_count
          FROM tandas t
          WHERE t.id = ?
        `,
      )
      .get(tandaId);

    return row ? mapTandaRow(row) : null;
  }

  /**
   * Add a participant to a tanda.
   *
   * @param input The participant input to persist.
   * @returns The created participant.
   */
  public addParticipant(input: CreateParticipantRecord): Participant {
    const result = this.database
      .prepare(
        `
          INSERT INTO participants (user_id, tanda_id, role, joined_at)
          VALUES (@userId, @tandaId, @role, @joinedAt)
        `,
      )
      .run(input);

    return this.getParticipantById(input.tandaId, Number(result.lastInsertRowid)) as Participant;
  }

  /**
   * Return every participant in a tanda.
   *
   * @param tandaId The tanda identifier.
   * @returns The participants of the tanda.
   */
  public listParticipants(tandaId: number): readonly Participant[] {
    const rows = this.database
      .prepare<[number], ParticipantRow>(
        `
          SELECT
            p.id,
            p.user_id,
            p.tanda_id,
            p.role,
            p.rotation_position,
            p.is_defaulter,
            p.joined_at,
            u.email,
            u.name
          FROM participants p
          INNER JOIN users u ON u.id = p.user_id
          WHERE p.tanda_id = ?
          ORDER BY
            CASE WHEN p.rotation_position IS NULL THEN 1 ELSE 0 END ASC,
            p.rotation_position ASC,
            p.id ASC
        `,
      )
      .all(tandaId);

    return rows.map(mapParticipantRow);
  }

  /**
   * Return a participant by identifier inside a tanda.
   *
   * @param tandaId The tanda identifier.
   * @param participantId The participant identifier.
   * @returns The participant when found, otherwise null.
   */
  public getParticipantById(tandaId: number, participantId: number): Participant | null {
    const row = this.database
      .prepare<[number, number], ParticipantRow>(
        `
          SELECT
            p.id,
            p.user_id,
            p.tanda_id,
            p.role,
            p.rotation_position,
            p.is_defaulter,
            p.joined_at,
            u.email,
            u.name
          FROM participants p
          INNER JOIN users u ON u.id = p.user_id
          WHERE p.tanda_id = ? AND p.id = ?
        `,
      )
      .get(tandaId, participantId);

    return row ? mapParticipantRow(row) : null;
  }

  /**
   * Return a participant by user identifier inside a tanda.
   *
   * @param tandaId The tanda identifier.
   * @param userId The user identifier.
   * @returns The participant when found, otherwise null.
   */
  public getParticipantByUserId(tandaId: number, userId: number): Participant | null {
    const row = this.database
      .prepare<[number, number], ParticipantRow>(
        `
          SELECT
            p.id,
            p.user_id,
            p.tanda_id,
            p.role,
            p.rotation_position,
            p.is_defaulter,
            p.joined_at,
            u.email,
            u.name
          FROM participants p
          INNER JOIN users u ON u.id = p.user_id
          WHERE p.tanda_id = ? AND p.user_id = ?
        `,
      )
      .get(tandaId, userId);

    return row ? mapParticipantRow(row) : null;
  }

  /**
   * Save the full tanda state.
   *
   * @param tanda The tanda state to persist.
   * @returns The saved tanda.
   */
  public saveTandaState(tanda: Tanda): Tanda {
    this.database
      .prepare(
        `
          UPDATE tandas
          SET
            name = @name,
            organizer_user_id = @organizerId,
            contribution_amount = @contributionAmount,
            status = @status,
            current_round = @currentRound,
            total_rounds = @totalRounds,
            created_at = @createdAt,
            updated_at = @updatedAt,
            started_at = @startedAt,
            round_started_at = @roundStartedAt,
            completed_at = @completedAt,
            cancelled_at = @cancelledAt
          WHERE id = @id
        `,
      )
      .run({
        id: tanda.id,
        name: tanda.name,
        organizerId: tanda.organizerId,
        contributionAmount: tanda.contributionAmount,
        status: tanda.status,
        currentRound: tanda.currentRound,
        totalRounds: tanda.totalRounds,
        createdAt: tanda.createdAt,
        updatedAt: tanda.updatedAt,
        startedAt: tanda.startedAt,
        roundStartedAt: tanda.roundStartedAt,
        completedAt: tanda.completedAt,
        cancelledAt: tanda.cancelledAt,
      });

    return this.getTandaById(tanda.id) as Tanda;
  }

  /**
   * Persist participant rotation assignments.
   *
   * @param tandaId The tanda identifier.
   * @param assignments The rotation assignments to apply.
   * @returns Nothing.
   */
  public assignRotationPositions(tandaId: number, assignments: readonly RotationAssignment[]): void {
    const statement = this.database.prepare(
      `
        UPDATE participants
        SET rotation_position = @rotationPosition
        WHERE tanda_id = @tandaId AND id = @participantId
      `,
    );

    for (const assignment of assignments) {
      statement.run({
        tandaId,
        participantId: assignment.participantId,
        rotationPosition: assignment.rotationPosition,
      });
    }
  }

  /**
   * Return all contributions for a tanda round.
   *
   * @param tandaId The tanda identifier.
   * @param round The round number.
   * @returns The stored contributions.
   */
  public listContributionsForRound(tandaId: number, round: number): readonly Contribution[] {
    const rows = this.database
      .prepare<[number, number], ContributionRow>(
        `
          SELECT
            c.id,
            c.tanda_id,
            c.participant_id,
            c.round,
            c.amount,
            c.status,
            c.penalty_amount,
            c.recorded_at,
            p.user_id,
            p.role,
            p.rotation_position,
            p.is_defaulter,
            p.joined_at,
            u.email,
            u.name
          FROM contributions c
          INNER JOIN participants p ON p.id = c.participant_id
          INNER JOIN users u ON u.id = p.user_id
          WHERE c.tanda_id = ? AND c.round = ?
          ORDER BY
            CASE WHEN p.rotation_position IS NULL THEN 1 ELSE 0 END ASC,
            p.rotation_position ASC,
            p.id ASC
        `,
      )
      .all(tandaId, round);

    return rows.map(mapContributionRow);
  }

  /**
   * Return a single contribution by participant and round.
   *
   * @param tandaId The tanda identifier.
   * @param participantId The participant identifier.
   * @param round The round number.
   * @returns The contribution when found, otherwise null.
   */
  public getContribution(tandaId: number, participantId: number, round: number): Contribution | null {
    const row = this.database
      .prepare<[number, number, number], ContributionRow>(
        `
          SELECT
            c.id,
            c.tanda_id,
            c.participant_id,
            c.round,
            c.amount,
            c.status,
            c.penalty_amount,
            c.recorded_at,
            p.user_id,
            p.role,
            p.rotation_position,
            p.is_defaulter,
            p.joined_at,
            u.email,
            u.name
          FROM contributions c
          INNER JOIN participants p ON p.id = c.participant_id
          INNER JOIN users u ON u.id = p.user_id
          WHERE c.tanda_id = ? AND c.participant_id = ? AND c.round = ?
        `,
      )
      .get(tandaId, participantId, round);

    return row ? mapContributionRow(row) : null;
  }

  /**
   * Create a contribution record.
   *
   * @param input The contribution input to persist.
   * @returns The created contribution.
   */
  public createContribution(input: CreateContributionRecord): Contribution {
    const result = this.database
      .prepare(
        `
          INSERT INTO contributions (
            tanda_id,
            participant_id,
            round,
            amount,
            status,
            penalty_amount,
            recorded_at
          )
          VALUES (
            @tandaId,
            @participantId,
            @round,
            @amount,
            @status,
            @penaltyAmount,
            @recordedAt
          )
        `,
      )
      .run(input);

    const row = this.database
      .prepare<[number], ContributionRow>(
        `
          SELECT
            c.id,
            c.tanda_id,
            c.participant_id,
            c.round,
            c.amount,
            c.status,
            c.penalty_amount,
            c.recorded_at,
            p.user_id,
            p.role,
            p.rotation_position,
            p.is_defaulter,
            p.joined_at,
            u.email,
            u.name
          FROM contributions c
          INNER JOIN participants p ON p.id = c.participant_id
          INNER JOIN users u ON u.id = p.user_id
          WHERE c.id = ?
        `,
      )
      .get(Number(result.lastInsertRowid));

    return mapContributionRow(row as ContributionRow);
  }

  /**
   * Return a participant contribution history ordered by round.
   *
   * @param participantId The participant identifier.
   * @returns The contribution history.
   */
  public listContributionHistory(participantId: number): readonly Contribution[] {
    const rows = this.database
      .prepare<[number], ContributionRow>(
        `
          SELECT
            c.id,
            c.tanda_id,
            c.participant_id,
            c.round,
            c.amount,
            c.status,
            c.penalty_amount,
            c.recorded_at,
            p.user_id,
            p.role,
            p.rotation_position,
            p.is_defaulter,
            p.joined_at,
            u.email,
            u.name
          FROM contributions c
          INNER JOIN participants p ON p.id = c.participant_id
          INNER JOIN users u ON u.id = p.user_id
          WHERE c.participant_id = ?
          ORDER BY c.round ASC, c.id ASC
        `,
      )
      .all(participantId);

    return rows.map(mapContributionRow);
  }

  /**
   * Return the latest contribution statuses for a participant.
   *
   * @param participantId The participant identifier.
   * @param limit The number of statuses to return.
   * @returns The latest statuses, newest first.
   */
  public listRecentContributionStatuses(
    participantId: number,
    limit: number,
  ): readonly ("paid" | "late" | "missed")[] {
    const rows = this.database
      .prepare<[number, number], { readonly status: "paid" | "late" | "missed" }>(
        `
          SELECT status
          FROM contributions
          WHERE participant_id = ?
          ORDER BY round DESC, id DESC
          LIMIT ?
        `,
      )
      .all(participantId, limit);

    return rows.map((row) => row.status);
  }

  /**
   * Update whether a participant is a defaulter.
   *
   * @param participantId The participant identifier.
   * @param isDefaulter The defaulter flag to persist.
   * @returns Nothing.
   */
  public setParticipantDefaulter(participantId: number, isDefaulter: boolean): void {
    this.database
      .prepare(
        `
          UPDATE participants
          SET is_defaulter = @isDefaulter
          WHERE id = @participantId
        `,
      )
      .run({
        participantId,
        isDefaulter: isDefaulter ? 1 : 0,
      });
  }

  /**
   * Execute repository operations inside a SQLite transaction.
   *
   * @param operation The operation to run transactionally.
   * @returns The operation result.
   */
  public runInTransaction<T>(operation: () => T): T {
    return this.database.transaction(operation)();
  }
}
