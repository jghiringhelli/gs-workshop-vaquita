import type Database from "better-sqlite3";

import { AppError, NotImplementedAppError } from "../../lib/errors";
import type {
  AdvanceTandaInput,
  CancelTandaInput,
  ContributionRecord,
  CreateTandaInput,
  JoinTandaInput,
  RecordContributionInput,
  RoundSummary,
  RoundContributionSummary,
  StartTandaInput,
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

interface ContributionRow {
  readonly id: number;
  readonly tanda_id: number;
  readonly participant_id: number;
  readonly round: number;
  readonly amount: number;
  readonly penalty_amount: number;
  readonly status: "pending" | "paid" | "late" | "missed";
  readonly recorded_at: string;
}

interface RoundSummaryRow {
  readonly participant_id: number;
  readonly user_id: number;
  readonly role: "organizer" | "member";
  readonly rotation_position: number | null;
  readonly contribution_status: "pending" | "paid" | "late" | "missed" | null;
  readonly amount: number | null;
  readonly penalty_amount: number | null;
}

export interface TandaRepository {
  create(input: CreateTandaInput): Tanda;
  findById(id: number): Tanda | null;
  listByUserId(userId: number): ReadonlyArray<Tanda>;
  listParticipants(tandaId: number): ReadonlyArray<TandaParticipant>;
  join(input: JoinTandaInput): TandaParticipant;
  start(input: StartTandaInput, orderedParticipantIds: ReadonlyArray<number>): Tanda;
  advance(input: AdvanceTandaInput): Tanda;
  cancel(input: CancelTandaInput): Tanda;
  recordContribution(input: RecordContributionInput): ContributionRecord;
  listContributionHistory(tandaId: number, participantId: number): ReadonlyArray<ContributionRecord>;
  getRoundSummary(tandaId: number, round: number): RoundSummary;
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
   * Activates a tanda and locks randomized rotation positions.
   * @param input Start request payload.
   * @param orderedParticipantIds Participant ids in their final rotation order.
   * @returns Updated tanda projection.
   */
  public start(input: StartTandaInput, orderedParticipantIds: ReadonlyArray<number>): Tanda {
    const transaction = this.database.transaction(
      (payload: StartTandaInput, participantIds: ReadonlyArray<number>): Tanda => {
        this.database
          .prepare("UPDATE participants SET rotation_position = NULL WHERE tanda_id = ?")
          .run(payload.tandaId);

        const updateParticipantStatement = this.database.prepare(
          `UPDATE participants
           SET rotation_position = ?
           WHERE id = ? AND tanda_id = ?`,
        );

        participantIds.forEach((participantId, index) => {
          updateParticipantStatement.run(index + 1, participantId, payload.tandaId);
        });

        this.database
          .prepare(
            `UPDATE tandas
             SET status = 'active', current_round = 1, total_rounds = ?
             WHERE id = ? AND organizer_id = ?`,
          )
          .run(participantIds.length, payload.tandaId, payload.organizerId);

        const tanda = this.findById(payload.tandaId);
        if (!tanda) {
          throw new AppError("Failed to reload started tanda.", 500, "PERSISTENCE_ERROR");
        }

        return tanda;
      },
    );

    return transaction(input, orderedParticipantIds);
  }

  /**
   * Advances a tanda to the next round or completes it when the last round finishes.
   * @param input Advance request payload.
   * @returns Updated tanda projection.
   */
  public advance(input: AdvanceTandaInput): Tanda {
    const transaction = this.database.transaction((payload: AdvanceTandaInput): Tanda => {
      const tanda = this.findById(payload.tandaId);
      if (!tanda) {
        throw new AppError("Failed to load tanda during advance.", 500, "PERSISTENCE_ERROR");
      }

      if (tanda.currentRound >= tanda.totalRounds) {
        this.database
          .prepare(
            `UPDATE tandas
             SET status = 'completed'
             WHERE id = ? AND organizer_id = ?`,
          )
          .run(payload.tandaId, payload.organizerId);
      } else {
        this.database
          .prepare(
            `UPDATE tandas
             SET current_round = current_round + 1
             WHERE id = ? AND organizer_id = ?`,
          )
          .run(payload.tandaId, payload.organizerId);
      }

      const updatedTanda = this.findById(payload.tandaId);
      if (!updatedTanda) {
        throw new AppError("Failed to reload advanced tanda.", 500, "PERSISTENCE_ERROR");
      }

      return updatedTanda;
    });

    return transaction(input);
  }

  /**
   * Cancels a tanda while preserving historical records.
   * @param input Cancel request payload.
   * @returns Updated tanda projection.
   */
  public cancel(input: CancelTandaInput): Tanda {
    this.database
      .prepare(
        `UPDATE tandas
         SET status = 'cancelled'
         WHERE id = ? AND organizer_id = ?`,
      )
      .run(input.tandaId, input.organizerId);

    const tanda = this.findById(input.tandaId);
    if (!tanda) {
      throw new AppError("Failed to reload cancelled tanda.", 500, "PERSISTENCE_ERROR");
    }

    return tanda;
  }

  /**
   * Records a contribution for a participant in the active round.
   * @param input Contribution payload.
   * @returns Persisted contribution record.
   */
  public recordContribution(input: RecordContributionInput): ContributionRecord {
    const result = this.database
      .prepare(
        `INSERT INTO contributions (
          tanda_id,
          participant_id,
          round,
          amount,
          penalty_amount,
          status
        ) VALUES (?, ?, ?, ?, 0, ?)`,
      )
      .run(input.tandaId, input.participantId, input.round, input.amount, input.status);

    const contribution = this.database
      .prepare(
        `SELECT id, tanda_id, participant_id, round, amount, penalty_amount, status, recorded_at
         FROM contributions
         WHERE id = ?`,
      )
      .get(Number(result.lastInsertRowid)) as ContributionRow | undefined;

    if (!contribution) {
      throw new AppError("Failed to reload persisted contribution.", 500, "PERSISTENCE_ERROR");
    }

    return mapContributionRow(contribution);
  }

  /**
   * Lists the contribution history for a participant in a tanda.
   * @param tandaId Tanda identifier.
   * @param participantId Participant identifier.
   * @returns Contribution records ordered by round.
   */
  public listContributionHistory(
    tandaId: number,
    participantId: number,
  ): ReadonlyArray<ContributionRecord> {
    const rows = this.database
      .prepare(
        `SELECT id, tanda_id, participant_id, round, amount, penalty_amount, status, recorded_at
         FROM contributions
         WHERE tanda_id = ? AND participant_id = ?
         ORDER BY round ASC, id ASC`,
      )
      .all(tandaId, participantId) as ReadonlyArray<ContributionRow>;

    return rows.map(mapContributionRow);
  }

  /**
   * Builds a round summary from participants and recorded contributions.
   * @param tandaId Tanda identifier.
   * @param round Requested round number.
   * @returns Aggregated round summary.
   */
  public getRoundSummary(tandaId: number, round: number): RoundSummary {
    const tanda = this.findById(tandaId);
    if (!tanda) {
      throw new AppError("Failed to load tanda for round summary.", 500, "PERSISTENCE_ERROR");
    }

    const rows = this.database
      .prepare(
        `SELECT
           p.id AS participant_id,
           p.user_id,
           p.role,
           p.rotation_position,
           c.status AS contribution_status,
           c.amount,
           c.penalty_amount
         FROM participants p
         LEFT JOIN contributions c
           ON c.participant_id = p.id
          AND c.tanda_id = p.tanda_id
          AND c.round = ?
         WHERE p.tanda_id = ?
         ORDER BY p.rotation_position ASC, p.id ASC`,
      )
      .all(round, tandaId) as ReadonlyArray<RoundSummaryRow>;

    const contributions = rows.map(mapRoundContributionSummaryRow);
    const paidParticipants = contributions.filter(
      (contribution) => contribution.contributionStatus !== "pending",
    ).length;
    const totalCollected = contributions.reduce(
      (total, contribution) => total + contribution.amount + contribution.penaltyAmount,
      0,
    );
    const potRecipient = contributions.find((contribution) => contribution.rotationPosition === round);

    return {
      tandaId,
      round,
      status: tanda.status,
      contributionAmount: tanda.contributionAmount,
      expectedParticipants: contributions.length,
      paidParticipants,
      pendingParticipants: contributions.length - paidParticipants,
      totalCollected,
      potRecipientParticipantId: potRecipient?.participantId ?? null,
      contributions,
    };
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

function mapContributionRow(row: ContributionRow): ContributionRecord {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    amount: row.amount,
    penaltyAmount: row.penalty_amount,
    status: row.status,
    recordedAt: row.recorded_at,
  };
}

function mapRoundContributionSummaryRow(row: RoundSummaryRow): RoundContributionSummary {
  return {
    participantId: row.participant_id,
    userId: row.user_id,
    role: row.role,
    rotationPosition: row.rotation_position,
    contributionStatus: row.contribution_status ?? "pending",
    amount: row.amount ?? 0,
    penaltyAmount: row.penalty_amount ?? 0,
  };
}