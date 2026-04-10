import type Database from "better-sqlite3";

import type {
  CreateContributionInput,
  CreateParticipantInput,
  CreateTandaRecordInput,
  TandaRepository,
  UpdateTandaRecordInput,
} from "./tandaRepository";
import type { Contribution, Participant, Tanda } from "./tandaTypes";

interface TandaRow {
  readonly id: number;
  readonly name: string;
  readonly organizer_id: number;
  readonly contribution_amount: number;
  readonly status: Tanda["status"];
  readonly current_round: number;
  readonly total_rounds: number;
  readonly started_at: string | null;
  readonly current_round_started_at: string;
  readonly cancelled_at: string | null;
  readonly completed_at: string | null;
}

interface ParticipantRow {
  readonly id: number;
  readonly user_id: number;
  readonly tanda_id: number;
  readonly role: Participant["role"];
  readonly rotation_position: number | null;
  readonly is_defaulter: number;
}

interface ContributionRow {
  readonly id: number;
  readonly tanda_id: number;
  readonly participant_id: number;
  readonly round: number;
  readonly amount: number;
  readonly status: Contribution["status"];
  readonly penalty_amount: number;
  readonly created_at: string;
}

/**
 * SQLite-backed implementation of the tanda repository port.
 */
export class SqliteTandaRepository implements TandaRepository {
  /**
   * Create a repository instance.
   *
   * @param database Open SQLite database connection.
   */
  public constructor(private readonly database: Database.Database) {}

  /**
   * Run an operation inside a database transaction.
   *
   * @param operation Operation to execute.
   * @returns Operation result.
   */
  public runInTransaction<T>(operation: () => T): T {
    return this.database.transaction(operation)();
  }

  /**
   * Persist a new tanda.
   *
   * @param input New tanda data.
   * @returns Created tanda.
   */
  public createTanda(input: CreateTandaRecordInput): Tanda {
    const result = this.database
      .prepare(`
        INSERT INTO tandas (
          name, organizer_id, contribution_amount, status, current_round, total_rounds,
          created_at, started_at, current_round_started_at, cancelled_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.name,
        input.organizerId,
        input.contributionAmount,
        input.status,
        input.currentRound,
        input.totalRounds,
        input.createdAt,
        input.startedAt,
        input.currentRoundStartedAt,
        input.cancelledAt,
        input.completedAt,
      );
    return this.findTandaById(Number(result.lastInsertRowid)) as Tanda;
  }

  /**
   * Persist tanda state changes.
   *
   * @param input Updated tanda state.
   * @returns Updated tanda.
   */
  public updateTanda(input: UpdateTandaRecordInput): Tanda {
    this.database
      .prepare(`
        UPDATE tandas
        SET status = ?, current_round = ?, total_rounds = ?, started_at = ?,
            current_round_started_at = ?, cancelled_at = ?, completed_at = ?
        WHERE id = ?
      `)
      .run(
        input.status,
        input.currentRound,
        input.totalRounds,
        input.startedAt,
        input.currentRoundStartedAt,
        input.cancelledAt,
        input.completedAt,
        input.id,
      );
    return this.findTandaById(input.id) as Tanda;
  }

  /**
   * Find a tanda by identifier.
   *
   * @param tandaId Tanda identifier.
   * @returns Matching tanda or null.
   */
  public findTandaById(tandaId: number): Tanda | null {
    const row = this.database
      .prepare(`
        SELECT id, name, organizer_id, contribution_amount, status, current_round,
               total_rounds, started_at, current_round_started_at, cancelled_at, completed_at
        FROM tandas
        WHERE id = ?
      `)
      .get(tandaId) as TandaRow | undefined;
    return row ? mapTandaRow(row) : null;
  }

  /**
   * List tandas for a user.
   *
   * @param userId User identifier.
   * @returns Matching tandas.
   */
  public listTandasForUser(userId: number): ReadonlyArray<Tanda> {
    const rows = this.database
      .prepare(`
        SELECT t.id, t.name, t.organizer_id, t.contribution_amount, t.status, t.current_round,
               t.total_rounds, t.started_at, t.current_round_started_at, t.cancelled_at, t.completed_at
        FROM tandas t
        INNER JOIN participants p ON p.tanda_id = t.id
        WHERE p.user_id = ?
        ORDER BY t.id ASC
      `)
      .all(userId) as ReadonlyArray<TandaRow>;
    return rows.map(mapTandaRow);
  }

  /**
   * Persist a participant.
   *
   * @param input Participant data.
   * @returns Created participant.
   */
  public createParticipant(input: CreateParticipantInput): Participant {
    const result = this.database
      .prepare(`
        INSERT INTO participants (user_id, tanda_id, role, rotation_position, is_defaulter, joined_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.userId,
        input.tandaId,
        input.role,
        input.rotationPosition,
        input.isDefaulter ? 1 : 0,
        input.joinedAt,
      );
    return this.findParticipantById(Number(result.lastInsertRowid)) as Participant;
  }

  /**
   * List participants for a tanda.
   *
   * @param tandaId Tanda identifier.
   * @returns Ordered participant list.
   */
  public listParticipants(tandaId: number): ReadonlyArray<Participant> {
    const rows = this.database
      .prepare(`
        SELECT id, user_id, tanda_id, role, rotation_position, is_defaulter
        FROM participants
        WHERE tanda_id = ?
        ORDER BY id ASC
      `)
      .all(tandaId) as ReadonlyArray<ParticipantRow>;
    return rows.map(mapParticipantRow);
  }

  /**
   * Find a participant by identifier.
   *
   * @param participantId Participant identifier.
   * @returns Matching participant or null.
   */
  public findParticipantById(participantId: number): Participant | null {
    const row = this.database
      .prepare(`
        SELECT id, user_id, tanda_id, role, rotation_position, is_defaulter
        FROM participants
        WHERE id = ?
      `)
      .get(participantId) as ParticipantRow | undefined;
    return row ? mapParticipantRow(row) : null;
  }

  /**
   * Find a participant by user and tanda.
   *
   * @param tandaId Tanda identifier.
   * @param userId User identifier.
   * @returns Matching participant or null.
   */
  public findParticipantByUserId(tandaId: number, userId: number): Participant | null {
    const row = this.database
      .prepare(`
        SELECT id, user_id, tanda_id, role, rotation_position, is_defaulter
        FROM participants
        WHERE tanda_id = ? AND user_id = ?
      `)
      .get(tandaId, userId) as ParticipantRow | undefined;
    return row ? mapParticipantRow(row) : null;
  }

  /**
   * Update a participant's rotation slot.
   *
   * @param participantId Participant identifier.
   * @param rotationPosition Assigned rotation position.
   * @returns Updated participant.
   */
  public updateParticipantRotation(participantId: number, rotationPosition: number): Participant {
    this.database
      .prepare("UPDATE participants SET rotation_position = ? WHERE id = ?")
      .run(rotationPosition, participantId);
    return this.findParticipantById(participantId) as Participant;
  }

  /**
   * Update a participant's defaulter flag.
   *
   * @param participantId Participant identifier.
   * @param isDefaulter New defaulter value.
   * @returns Updated participant.
   */
  public updateParticipantDefaulter(participantId: number, isDefaulter: boolean): Participant {
    this.database
      .prepare("UPDATE participants SET is_defaulter = ? WHERE id = ?")
      .run(isDefaulter ? 1 : 0, participantId);
    return this.findParticipantById(participantId) as Participant;
  }

  /**
   * Persist a contribution.
   *
   * @param input Contribution data.
   * @returns Created contribution.
   */
  public createContribution(input: CreateContributionInput): Contribution {
    const result = this.database
      .prepare(`
        INSERT INTO contributions (tanda_id, participant_id, round, amount, status, penalty_amount, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.tandaId,
        input.participantId,
        input.round,
        input.amount,
        input.status,
        input.penaltyAmount,
        input.createdAt,
      );
    return this.findContributionById(Number(result.lastInsertRowid)) as Contribution;
  }

  /**
   * Find a contribution by participant and round.
   *
   * @param participantId Participant identifier.
   * @param round Round number.
   * @returns Matching contribution or null.
   */
  public findContributionByParticipantAndRound(participantId: number, round: number): Contribution | null {
    const row = this.database
      .prepare(`
        SELECT id, tanda_id, participant_id, round, amount, status, penalty_amount, created_at
        FROM contributions
        WHERE participant_id = ? AND round = ?
      `)
      .get(participantId, round) as ContributionRow | undefined;
    return row ? mapContributionRow(row) : null;
  }

  /**
   * List stored contributions for a round.
   *
   * @param tandaId Tanda identifier.
   * @param round Round number.
   * @returns Matching contributions.
   */
  public listContributionsForRound(tandaId: number, round: number): ReadonlyArray<Contribution> {
    const rows = this.database
      .prepare(`
        SELECT id, tanda_id, participant_id, round, amount, status, penalty_amount, created_at
        FROM contributions
        WHERE tanda_id = ? AND round = ?
        ORDER BY participant_id ASC
      `)
      .all(tandaId, round) as ReadonlyArray<ContributionRow>;
    return rows.map(mapContributionRow);
  }

  /**
   * List stored contributions for a participant.
   *
   * @param tandaId Tanda identifier.
   * @param participantId Participant identifier.
   * @returns Matching contributions.
   */
  public listContributionsForParticipant(tandaId: number, participantId: number): ReadonlyArray<Contribution> {
    const rows = this.database
      .prepare(`
        SELECT id, tanda_id, participant_id, round, amount, status, penalty_amount, created_at
        FROM contributions
        WHERE tanda_id = ? AND participant_id = ?
        ORDER BY round ASC
      `)
      .all(tandaId, participantId) as ReadonlyArray<ContributionRow>;
    return rows.map(mapContributionRow);
  }

  /**
   * Find a contribution by identifier.
   *
   * @param contributionId Contribution identifier.
   * @returns Matching contribution or null.
   */
  private findContributionById(contributionId: number): Contribution | null {
    const row = this.database
      .prepare(`
        SELECT id, tanda_id, participant_id, round, amount, status, penalty_amount, created_at
        FROM contributions
        WHERE id = ?
      `)
      .get(contributionId) as ContributionRow | undefined;
    return row ? mapContributionRow(row) : null;
  }
}

/**
 * Map a tanda database row to a domain object.
 *
 * @param row Raw database row.
 * @returns Domain tanda object.
 */
function mapTandaRow(row: TandaRow): Tanda {
  return {
    id: row.id,
    name: row.name,
    organizerId: row.organizer_id,
    contributionAmount: row.contribution_amount,
    status: row.status,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
    startedAt: row.started_at,
    currentRoundStartedAt: row.current_round_started_at,
    cancelledAt: row.cancelled_at,
    completedAt: row.completed_at,
  };
}

/**
 * Map a participant database row to a domain object.
 *
 * @param row Raw database row.
 * @returns Domain participant object.
 */
function mapParticipantRow(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role,
    rotationPosition: row.rotation_position,
    isDefaulter: row.is_defaulter === 1,
  };
}

/**
 * Map a contribution database row to a domain object.
 *
 * @param row Raw database row.
 * @returns Domain contribution object.
 */
function mapContributionRow(row: ContributionRow): Contribution {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    amount: row.amount,
    status: row.status,
    penaltyAmount: row.penalty_amount,
    createdAt: row.created_at,
  };
}
