import type Database from "better-sqlite3"
import type {
  ContributionRecord,
  PaginatedResult,
  PaginationInput,
  ParticipantRecord,
  ParticipantWithUserRecord,
  TandaRecord,
  TandaRepository,
} from "./types"

/**
 * SQLite adapter for tanda persistence.
 */
export class SqliteTandaRepository implements TandaRepository {
  /**
   * Create a SQLite-backed tanda repository.
   *
   * @param database - SQLite database handle.
   */
  public constructor(private readonly database: Database.Database) {}

  /**
   * Run work inside a SQLite transaction.
   *
   * @param operation - Work to execute transactionally.
   * @returns Operation result.
   */
  public runInTransaction<T>(operation: () => T): T {
    return this.database.transaction(operation)()
  }

  /**
   * Persist a new tanda.
   *
   * @param input - Tanda persistence input.
   * @returns Persisted tanda record.
   */
  public createTanda(input: {
    readonly name: string
    readonly organizerUserId: number
    readonly contributionAmountMinor: number
    readonly currencyCode: string
    readonly status: TandaRecord["status"]
    readonly currentRound: number
    readonly totalRounds: number
    readonly contributionWindowHours: number
    readonly currentRoundStartedAt: string | null
    readonly createdAt: string
  }): TandaRecord {
    const result = this.database
      .prepare(
        `
          INSERT INTO tandas (
            name,
            organizer_user_id,
            contribution_amount_minor,
            currency_code,
            status,
            current_round,
            total_rounds,
            contribution_window_hours,
            current_round_started_at,
            created_at
          )
          VALUES (
            @name,
            @organizerUserId,
            @contributionAmountMinor,
            @currencyCode,
            @status,
            @currentRound,
            @totalRounds,
            @contributionWindowHours,
            @currentRoundStartedAt,
            @createdAt
          )
        `,
      )
      .run(input)

    return this.findTandaById(Number(result.lastInsertRowid)) as TandaRecord
  }

  /**
   * Update the total rounds for a tanda.
   *
   * @param tandaId - Tanda id.
   * @param totalRounds - New round count.
   */
  public updateTandaTotalRounds(tandaId: number, totalRounds: number): void {
    this.database
      .prepare(
        `
          UPDATE tandas
          SET total_rounds = ?
          WHERE id = ?
        `,
      )
      .run(totalRounds, tandaId)
  }

  /**
   * Fetch a tanda by id.
   *
   * @param id - Tanda id.
   * @returns Tanda record or null.
   */
  public findTandaById(id: number): TandaRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            name,
            organizer_user_id,
            contribution_amount_minor,
            currency_code,
            status,
            current_round,
            total_rounds,
            contribution_window_hours,
            current_round_started_at,
            created_at,
            cancelled_at,
            completed_at
          FROM tandas
          WHERE id = ?
        `,
      )
      .get(id) as TandaRow | undefined

    return row ? mapTandaRow(row) : null
  }

  /**
   * List tandas with optional membership filtering.
   *
   * @param input - Pagination and optional user filter.
   * @returns Paginated tanda records.
   */
  public listTandas(
    input: { readonly userId?: number } & PaginationInput,
  ): PaginatedResult<TandaRecord> {
    const offset = (input.page - 1) * input.pageSize
    const items = input.userId
      ? (this.database
          .prepare(
            `
              SELECT
                t.id,
                t.name,
                t.organizer_user_id,
                t.contribution_amount_minor,
                t.currency_code,
                t.status,
                t.current_round,
                t.total_rounds,
                t.contribution_window_hours,
                t.current_round_started_at,
                t.created_at,
                t.cancelled_at,
                t.completed_at
              FROM tandas t
              WHERE EXISTS (
                SELECT 1
                FROM participants p
                WHERE p.tanda_id = t.id AND p.user_id = ?
              )
              ORDER BY t.id DESC
              LIMIT ? OFFSET ?
            `,
          )
          .all(input.userId, input.pageSize, offset) as TandaRow[])
      : (this.database
          .prepare(
            `
              SELECT
                id,
                name,
                organizer_user_id,
                contribution_amount_minor,
                currency_code,
                status,
                current_round,
                total_rounds,
                contribution_window_hours,
                current_round_started_at,
                created_at,
                cancelled_at,
                completed_at
              FROM tandas
              ORDER BY id DESC
              LIMIT ? OFFSET ?
            `,
          )
          .all(input.pageSize, offset) as TandaRow[])

    const total = input.userId
      ? (
          this.database
            .prepare(
              `
                SELECT COUNT(*) as total
                FROM tandas t
                WHERE EXISTS (
                  SELECT 1
                  FROM participants p
                  WHERE p.tanda_id = t.id AND p.user_id = ?
                )
              `,
            )
            .get(input.userId) as { total: number }
        ).total
      : (this.database.prepare("SELECT COUNT(*) as total FROM tandas").get() as {
          total: number
        }).total

    return {
      items: items.map(mapTandaRow),
      total,
      page: input.page,
      pageSize: input.pageSize,
    }
  }

  /**
   * Persist a participant in a tanda.
   *
   * @param input - Participant persistence input.
   * @returns Persisted participant record.
   */
  public addParticipant(input: {
    readonly userId: number
    readonly tandaId: number
    readonly role: ParticipantRecord["role"]
    readonly rotationPosition: number | null
    readonly isDefaulter: boolean
    readonly joinedAt: string
  }): ParticipantRecord {
    const result = this.database
      .prepare(
        `
          INSERT INTO participants (
            user_id,
            tanda_id,
            role,
            rotation_position,
            is_defaulter,
            joined_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        input.userId,
        input.tandaId,
        input.role,
        input.rotationPosition,
        input.isDefaulter ? 1 : 0,
        input.joinedAt,
      )

    return this.findParticipantById(Number(result.lastInsertRowid)) as ParticipantRecord
  }

  /**
   * Fetch a participant by participant id.
   *
   * @param id - Participant id.
   * @returns Participant with user details or null.
   */
  public findParticipantById(id: number): ParticipantWithUserRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT
            p.id,
            p.user_id,
            p.tanda_id,
            p.role,
            p.rotation_position,
            p.is_defaulter,
            p.joined_at,
            u.name,
            u.email
          FROM participants p
          INNER JOIN users u ON u.id = p.user_id
          WHERE p.id = ?
        `,
      )
      .get(id) as ParticipantRow | undefined

    return row ? mapParticipantRow(row) : null
  }

  /**
   * Fetch a participant by tanda and user id.
   *
   * @param tandaId - Tanda id.
   * @param userId - User id.
   * @returns Participant with user details or null.
   */
  public findParticipantByUser(
    tandaId: number,
    userId: number,
  ): ParticipantWithUserRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT
            p.id,
            p.user_id,
            p.tanda_id,
            p.role,
            p.rotation_position,
            p.is_defaulter,
            p.joined_at,
            u.name,
            u.email
          FROM participants p
          INNER JOIN users u ON u.id = p.user_id
          WHERE p.tanda_id = ? AND p.user_id = ?
        `,
      )
      .get(tandaId, userId) as ParticipantRow | undefined

    return row ? mapParticipantRow(row) : null
  }

  /**
   * List all participants in a tanda.
   *
   * @param tandaId - Tanda id.
   * @returns Participants ordered by join order then rotation.
   */
  public listParticipants(tandaId: number): ReadonlyArray<ParticipantWithUserRecord> {
    const rows = this.database
      .prepare(
        `
          SELECT
            p.id,
            p.user_id,
            p.tanda_id,
            p.role,
            p.rotation_position,
            p.is_defaulter,
            p.joined_at,
            u.name,
            u.email
          FROM participants p
          INNER JOIN users u ON u.id = p.user_id
          WHERE p.tanda_id = ?
          ORDER BY
            CASE WHEN p.rotation_position IS NULL THEN 999999 ELSE p.rotation_position END ASC,
            p.joined_at ASC
        `,
      )
      .all(tandaId) as ParticipantRow[]

    return rows.map(mapParticipantRow)
  }

  /**
   * Assign a rotation position to a participant.
   *
   * @param participantId - Participant id.
   * @param rotationPosition - Assigned rotation slot.
   */
  public updateParticipantRotation(participantId: number, rotationPosition: number): void {
    this.database
      .prepare(
        `
          UPDATE participants
          SET rotation_position = ?
          WHERE id = ?
        `,
      )
      .run(rotationPosition, participantId)
  }

  /**
   * Mark a tanda as active and initialize its round tracking.
   *
   * @param input - Activation data.
   */
  public activateTanda(input: {
    readonly tandaId: number
    readonly totalRounds: number
    readonly currentRound: number
    readonly currentRoundStartedAt: string
  }): void {
    this.database
      .prepare(
        `
          UPDATE tandas
          SET
            status = 'active',
            total_rounds = @totalRounds,
            current_round = @currentRound,
            current_round_started_at = @currentRoundStartedAt
          WHERE id = @tandaId
        `,
      )
      .run(input)
  }

  /**
   * Cancel a tanda.
   *
   * @param tandaId - Tanda id.
   * @param cancelledAt - Cancellation timestamp.
   */
  public cancelTanda(tandaId: number, cancelledAt: string): void {
    this.database
      .prepare(
        `
          UPDATE tandas
          SET status = 'cancelled', cancelled_at = ?
          WHERE id = ?
        `,
      )
      .run(cancelledAt, tandaId)
  }

  /**
   * Complete a tanda.
   *
   * @param tandaId - Tanda id.
   * @param completedAt - Completion timestamp.
   */
  public completeTanda(tandaId: number, completedAt: string): void {
    this.database
      .prepare(
        `
          UPDATE tandas
          SET status = 'completed', completed_at = ?
          WHERE id = ?
        `,
      )
      .run(completedAt, tandaId)
  }

  /**
   * Advance an active tanda to the next round.
   *
   * @param tandaId - Tanda id.
   * @param nextRound - Next round number.
   * @param currentRoundStartedAt - New round start timestamp.
   */
  public advanceTandaRound(
    tandaId: number,
    nextRound: number,
    currentRoundStartedAt: string,
  ): void {
    this.database
      .prepare(
        `
          UPDATE tandas
          SET current_round = ?, current_round_started_at = ?
          WHERE id = ?
        `,
      )
      .run(nextRound, currentRoundStartedAt, tandaId)
  }

  /**
   * Find an existing contribution for a participant and round.
   *
   * @param tandaId - Tanda id.
   * @param participantId - Participant id.
   * @param round - Round number.
   * @returns Matching contribution or null.
   */
  public findContribution(
    tandaId: number,
    participantId: number,
    round: number,
  ): ContributionRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            tanda_id,
            participant_id,
            round,
            amount_minor,
            penalty_minor,
            status,
            recorded_at,
            paid_at
          FROM contributions
          WHERE tanda_id = ? AND participant_id = ? AND round = ?
        `,
      )
      .get(tandaId, participantId, round) as ContributionRow | undefined

    return row ? mapContributionRow(row) : null
  }

  /**
   * Persist a contribution.
   *
   * @param input - Contribution persistence input.
   * @returns Persisted contribution record.
   */
  public createContribution(input: {
    readonly tandaId: number
    readonly participantId: number
    readonly round: number
    readonly amountMinor: number
    readonly penaltyMinor: number
    readonly status: ContributionRecord["status"]
    readonly recordedAt: string
    readonly paidAt: string | null
  }): ContributionRecord {
    const result = this.database
      .prepare(
        `
          INSERT INTO contributions (
            tanda_id,
            participant_id,
            round,
            amount_minor,
            penalty_minor,
            status,
            recorded_at,
            paid_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        input.tandaId,
        input.participantId,
        input.round,
        input.amountMinor,
        input.penaltyMinor,
        input.status,
        input.recordedAt,
        input.paidAt,
      )

    const row = this.database
      .prepare(
        `
          SELECT
            id,
            tanda_id,
            participant_id,
            round,
            amount_minor,
            penalty_minor,
            status,
            recorded_at,
            paid_at
          FROM contributions
          WHERE id = ?
        `,
      )
      .get(Number(result.lastInsertRowid)) as ContributionRow

    return mapContributionRow(row)
  }

  /**
   * List all contribution records for a round.
   *
   * @param tandaId - Tanda id.
   * @param round - Round number.
   * @returns Contribution records.
   */
  public listContributionsForRound(
    tandaId: number,
    round: number,
  ): ReadonlyArray<ContributionRecord> {
    const rows = this.database
      .prepare(
        `
          SELECT
            id,
            tanda_id,
            participant_id,
            round,
            amount_minor,
            penalty_minor,
            status,
            recorded_at,
            paid_at
          FROM contributions
          WHERE tanda_id = ? AND round = ?
          ORDER BY participant_id ASC
        `,
      )
      .all(tandaId, round) as ContributionRow[]

    return rows.map(mapContributionRow)
  }

  /**
   * List contribution history for a participant.
   *
   * @param tandaId - Tanda id.
   * @param participantId - Participant id.
   * @returns Contribution history.
   */
  public listParticipantHistory(
    tandaId: number,
    participantId: number,
  ): ReadonlyArray<ContributionRecord> {
    const rows = this.database
      .prepare(
        `
          SELECT
            id,
            tanda_id,
            participant_id,
            round,
            amount_minor,
            penalty_minor,
            status,
            recorded_at,
            paid_at
          FROM contributions
          WHERE tanda_id = ? AND participant_id = ?
          ORDER BY round ASC
        `,
      )
      .all(tandaId, participantId) as ContributionRow[]

    return rows.map(mapContributionRow)
  }

  /**
   * List tanda participants that have no contribution for the given round.
   *
   * @param tandaId - Tanda id.
   * @param round - Round number.
   * @returns Participants without a contribution record.
   */
  public listParticipantsWithoutContribution(
    tandaId: number,
    round: number,
  ): ReadonlyArray<ParticipantWithUserRecord> {
    const rows = this.database
      .prepare(
        `
          SELECT
            p.id,
            p.user_id,
            p.tanda_id,
            p.role,
            p.rotation_position,
            p.is_defaulter,
            p.joined_at,
            u.name,
            u.email
          FROM participants p
          INNER JOIN users u ON u.id = p.user_id
          LEFT JOIN contributions c
            ON c.participant_id = p.id
           AND c.tanda_id = p.tanda_id
           AND c.round = ?
          WHERE p.tanda_id = ? AND c.id IS NULL
          ORDER BY p.id ASC
        `,
      )
      .all(round, tandaId) as ParticipantRow[]

    return rows.map(mapParticipantRow)
  }

  /**
   * Count consecutive recent missed contributions for a participant.
   *
   * @param participantId - Participant id.
   * @param limit - Number of most recent rounds to inspect.
   * @returns Count of consecutive recent misses.
   */
  public countRecentMisses(participantId: number, limit: number): number {
    const rows = this.database
      .prepare(
        `
          SELECT status
          FROM contributions
          WHERE participant_id = ?
          ORDER BY round DESC
          LIMIT ?
        `,
      )
      .all(participantId, limit) as Array<{ status: string }>

    let misses = 0

    for (const row of rows) {
      if (row.status !== "missed") {
        break
      }

      misses += 1
    }

    return misses
  }

  /**
   * Flag a participant as a defaulter.
   *
   * @param participantId - Participant id.
   */
  public setParticipantDefaulter(participantId: number): void {
    this.database
      .prepare(
        `
          UPDATE participants
          SET is_defaulter = 1
          WHERE id = ?
        `,
      )
      .run(participantId)
  }
}

interface TandaRow {
  readonly id: number
  readonly name: string
  readonly organizer_user_id: number
  readonly contribution_amount_minor: number
  readonly currency_code: string
  readonly status: TandaRecord["status"]
  readonly current_round: number
  readonly total_rounds: number
  readonly contribution_window_hours: number
  readonly current_round_started_at: string | null
  readonly created_at: string
  readonly cancelled_at: string | null
  readonly completed_at: string | null
}

interface ParticipantRow {
  readonly id: number
  readonly user_id: number
  readonly tanda_id: number
  readonly role: ParticipantRecord["role"]
  readonly rotation_position: number | null
  readonly is_defaulter: number
  readonly joined_at: string
  readonly name: string
  readonly email: string
}

interface ContributionRow {
  readonly id: number
  readonly tanda_id: number
  readonly participant_id: number
  readonly round: number
  readonly amount_minor: number
  readonly penalty_minor: number
  readonly status: ContributionRecord["status"]
  readonly recorded_at: string
  readonly paid_at: string | null
}

/**
 * Convert a SQLite tanda row to a domain record.
 *
 * @param row - Raw SQLite row.
 * @returns Normalized tanda record.
 */
function mapTandaRow(row: TandaRow): TandaRecord {
  return {
    id: row.id,
    name: row.name,
    organizerUserId: row.organizer_user_id,
    contributionAmountMinor: row.contribution_amount_minor,
    currencyCode: row.currency_code,
    status: row.status,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
    contributionWindowHours: row.contribution_window_hours,
    currentRoundStartedAt: row.current_round_started_at,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    completedAt: row.completed_at,
  }
}

/**
 * Convert a SQLite participant row to a domain record.
 *
 * @param row - Raw SQLite row.
 * @returns Normalized participant record with user details.
 */
function mapParticipantRow(row: ParticipantRow): ParticipantWithUserRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role,
    rotationPosition: row.rotation_position,
    isDefaulter: row.is_defaulter === 1,
    joinedAt: row.joined_at,
    name: row.name,
    email: row.email,
  }
}

/**
 * Convert a SQLite contribution row to a domain record.
 *
 * @param row - Raw SQLite row.
 * @returns Normalized contribution record.
 */
function mapContributionRow(row: ContributionRow): ContributionRecord {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    amountMinor: row.amount_minor,
    penaltyMinor: row.penalty_minor,
    status: row.status,
    recordedAt: row.recorded_at,
    paidAt: row.paid_at,
  }
}
