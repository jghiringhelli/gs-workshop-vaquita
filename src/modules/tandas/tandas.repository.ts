import { businessConfig } from "../../config/env";
import { db, runInTransaction } from "../../db/database";
import { ConflictError, InternalInvariantError } from "../../errors/app-error";

export type TandaRecord = {
  id: number;
  name: string;
  organizerId: number;
  contributionAmount: number;
  status: "forming" | "active" | "completed" | "cancelled";
  currentRound: number;
  totalRounds: number;
};

export type ParticipantRecord = {
  id: number;
  userId: number;
  tandaId: number;
  role: "organizer" | "member";
  rotationPosition: number | null;
  isDefaulter: boolean;
};

export type ContributionRecord = {
  id: number;
  tandaId: number;
  participantId: number;
  round: number;
  amount: number;
  penaltyAmount: number;
  status: "pending" | "paid" | "late" | "missed";
  paidAt: string | null;
};

export type RoundSummary = {
  round: number;
  receiver: ParticipantRecord | null;
  contributions: ContributionRecord[];
  totals: {
    expected: number;
    collected: number;
    penalties: number;
    missingCount: number;
  };
};

type TandaRow = {
  id: number;
  name: string;
  organizer_id: number;
  contribution_amount: number;
  status: TandaRecord["status"];
  current_round: number;
  total_rounds: number;
  round_started_at: string | null;
};

type CreateTandaInput = {
  name: string;
  organizerId: number;
  contributionAmount: number;
};

type ParticipantRow = {
  id: number;
  user_id: number;
  tanda_id: number;
  role: ParticipantRecord["role"];
  rotation_position: number | null;
  is_defaulter: number;
};

type ContributionRow = {
  id: number;
  tanda_id: number;
  participant_id: number;
  round: number;
  amount: number;
  penalty_amount: number;
  status: ContributionRecord["status"];
  paid_at: string | null;
};

type TandaState = TandaRecord & {
  roundStartedAt: string | null;
};

export class TandasRepository {
  public create(input: CreateTandaInput): TandaRecord {
    return runInTransaction(() => {
      const insertResult = db
        .prepare(
          `
            INSERT INTO tandas (
              name,
              organizer_id,
              contribution_amount,
              status,
              current_round,
              total_rounds
            )
            VALUES (
              @name,
              @organizerId,
              @contributionAmount,
              'forming',
              0,
              0
            )
          `,
        )
        .run(input);

      const tandaId = Number(insertResult.lastInsertRowid);

      db.prepare(
        `
          INSERT INTO participants (user_id, tanda_id, role, rotation_position)
          VALUES (?, ?, 'organizer', 1)
        `,
      ).run(input.organizerId, tandaId);

      return this.findByIdOrThrow(tandaId);
    });
  }

  public findAllForUser(userId: number): TandaRecord[] {
    const rows = db
      .prepare(
        `
          SELECT
            t.id,
            t.name,
            t.organizer_id,
            t.contribution_amount,
            t.status,
            t.current_round,
            t.total_rounds
          FROM tandas t
          INNER JOIN participants p ON p.tanda_id = t.id
          WHERE p.user_id = ?
          ORDER BY t.id ASC
        `,
      )
      .all(userId) as TandaRow[];

    return rows.map(mapTandaRow);
  }

  public findById(id: number): TandaRecord | null {
    const row = db
      .prepare(
        `
          SELECT id, name, organizer_id, contribution_amount, status, current_round, total_rounds
          FROM tandas
          WHERE id = ?
        `,
      )
      .get(id) as TandaRow | undefined;

    return row ? mapTandaRow(row) : null;
  }

  public findStateById(id: number): TandaState | null {
    const row = db
      .prepare(
        `
          SELECT id, name, organizer_id, contribution_amount, status, current_round, total_rounds, round_started_at
          FROM tandas
          WHERE id = ?
        `,
      )
      .get(id) as TandaRow | undefined;

    return row ? mapTandaStateRow(row) : null;
  }

  public joinTanda(tandaId: number, userId: number): ParticipantRecord {
    return runInTransaction(() => {
      const tanda = this.findById(tandaId);

      if (!tanda) {
        throw new ConflictError(`Tanda ${tandaId} does not exist.`);
      }

      if (tanda.status !== "forming") {
        throw new ConflictError("Participants can only join tandas in forming status.");
      }

      const existingParticipant = this.findParticipantByUser(tandaId, userId);
      if (existingParticipant) {
        throw new ConflictError("User is already part of this tanda.");
      }

      const participantCount = this.countParticipants(tandaId);
      if (participantCount >= businessConfig.maxParticipants) {
        throw new ConflictError("This tanda already reached the maximum number of participants.");
      }

      const result = db
        .prepare(
          `
            INSERT INTO participants (user_id, tanda_id, role, rotation_position)
            VALUES (?, ?, 'member', ?)
          `,
        )
        .run(userId, tandaId, participantCount + 1);

      return this.findParticipantById(Number(result.lastInsertRowid));
    });
  }

  public listParticipants(tandaId: number): ParticipantRecord[] {
    const rows = db
      .prepare(
        `
          SELECT id, user_id, tanda_id, role, rotation_position, is_defaulter
          FROM participants
          WHERE tanda_id = ?
          ORDER BY rotation_position ASC, id ASC
        `,
      )
      .all(tandaId) as ParticipantRow[];

    return rows.map(mapParticipantRow);
  }

  public startTanda(tandaId: number, orderedParticipantIds: number[]): TandaRecord {
    return runInTransaction(() => {
      db.prepare(
        `
          UPDATE tandas
          SET status = 'active', current_round = 1, total_rounds = ?, round_started_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      ).run(orderedParticipantIds.length, tandaId);

      const updateRotation = db.prepare(
        `
          UPDATE participants
          SET rotation_position = ?
          WHERE id = ? AND tanda_id = ?
        `,
      );

      orderedParticipantIds.forEach((participantId, index) => {
        updateRotation.run(index + 1, participantId, tandaId);
      });

      return this.findByIdOrThrow(tandaId);
    });
  }

  public cancelTanda(tandaId: number): TandaRecord {
    db.prepare(
      `
        UPDATE tandas
        SET status = 'cancelled'
        WHERE id = ?
      `,
    ).run(tandaId);

    return this.findByIdOrThrow(tandaId);
  }

  public advanceTanda(tandaId: number): TandaRecord {
    return runInTransaction(() => {
      const tanda = this.findStateByIdOrThrow(tandaId);

      this.markMissingContributionsForRound(tandaId, tanda.currentRound, tanda.contributionAmount);
      this.refreshDefaulterFlags(tandaId);

      if (tanda.currentRound >= tanda.totalRounds) {
        db.prepare(
          `
            UPDATE tandas
            SET status = 'completed'
            WHERE id = ?
          `,
        ).run(tandaId);

        return this.findByIdOrThrow(tandaId);
      }

      db.prepare(
        `
          UPDATE tandas
          SET current_round = current_round + 1, round_started_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      ).run(tandaId);

      return this.findByIdOrThrow(tandaId);
    });
  }

  public recordContribution(tandaId: number, participantId: number, paidAt: string): ContributionRecord {
    return runInTransaction(() => {
      const tanda = this.findStateByIdOrThrow(tandaId);
      const participant = this.findParticipantById(participantId);

      if (participant.tandaId !== tandaId) {
        throw new ConflictError("Participant does not belong to this tanda.");
      }

      if (tanda.status !== "active") {
        throw new ConflictError("Contributions can only be recorded for active tandas.");
      }

      const existingContribution = this.findContributionByParticipantAndRound(
        tandaId,
        participantId,
        tanda.currentRound,
      );
      if (existingContribution) {
        throw new ConflictError("Contribution for this participant and round already exists.");
      }

      const isLate = this.isContributionLate(tanda.roundStartedAt, paidAt);
      const penaltyAmount = isLate ? Math.ceil(tanda.contributionAmount * businessConfig.latePenaltyRate) : 0;
      const status: ContributionRecord["status"] = isLate ? "late" : "paid";

      const result = db
        .prepare(
          `
            INSERT INTO contributions (tanda_id, participant_id, round, amount, penalty_amount, status, paid_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          tandaId,
          participantId,
          tanda.currentRound,
          tanda.contributionAmount,
          penaltyAmount,
          status,
          paidAt,
        );

      this.refreshDefaulterFlags(tandaId);

      return this.findContributionById(Number(result.lastInsertRowid));
    });
  }

  public getRoundSummary(tandaId: number, round: number): RoundSummary {
    const tanda = this.findByIdOrThrow(tandaId);
    const contributions = this.listContributionsForRound(tandaId, round);
    const receiver = this.findParticipantByRotationPosition(tandaId, round);
    const participantCount = this.countParticipants(tandaId);

    return {
      round,
      receiver,
      contributions,
      totals: {
        expected: participantCount * tanda.contributionAmount,
        collected: contributions.reduce((sum, contribution) => sum + contribution.amount, 0),
        penalties: contributions.reduce((sum, contribution) => sum + contribution.penaltyAmount, 0),
        missingCount: contributions.filter((contribution) => contribution.status === "missed").length,
      },
    };
  }

  public getParticipantHistory(tandaId: number, participantId: number): ContributionRecord[] {
    const rows = db
      .prepare(
        `
          SELECT id, tanda_id, participant_id, round, amount, penalty_amount, status, paid_at
          FROM contributions
          WHERE tanda_id = ? AND participant_id = ?
          ORDER BY round ASC, id ASC
        `,
      )
      .all(tandaId, participantId) as ContributionRow[];

    return rows.map(mapContributionRow);
  }

  public userExists(userId: number): boolean {
    const row = db.prepare("SELECT id FROM users WHERE id = ?").get(userId) as { id: number } | undefined;
    return Boolean(row);
  }

  public participantExists(tandaId: number, userId: number): boolean {
    return Boolean(this.findParticipantByUser(tandaId, userId));
  }

  public findParticipant(tandaId: number, participantId: number): ParticipantRecord | null {
    const row = db
      .prepare(
        `
          SELECT id, user_id, tanda_id, role, rotation_position, is_defaulter
          FROM participants
          WHERE id = ? AND tanda_id = ?
        `,
      )
      .get(participantId, tandaId) as ParticipantRow | undefined;

    return row ? mapParticipantRow(row) : null;
  }

  private countParticipants(tandaId: number): number {
    const row = db
      .prepare("SELECT COUNT(*) AS total FROM participants WHERE tanda_id = ?")
      .get(tandaId) as { total: number };

    return row.total;
  }

  private findParticipantByUser(tandaId: number, userId: number): ParticipantRecord | null {
    const row = db
      .prepare(
        `
          SELECT id, user_id, tanda_id, role, rotation_position, is_defaulter
          FROM participants
          WHERE tanda_id = ? AND user_id = ?
        `,
      )
      .get(tandaId, userId) as ParticipantRow | undefined;

    return row ? mapParticipantRow(row) : null;
  }

  private findParticipantById(id: number): ParticipantRecord {
    const row = db
      .prepare(
        `
          SELECT id, user_id, tanda_id, role, rotation_position, is_defaulter
          FROM participants
          WHERE id = ?
        `,
      )
      .get(id) as ParticipantRow | undefined;

    if (!row) {
      throw new InternalInvariantError(`Participant ${id} was created but could not be reloaded.`);
    }

    return mapParticipantRow(row);
  }

  private findParticipantByRotationPosition(tandaId: number, rotationPosition: number): ParticipantRecord | null {
    const row = db
      .prepare(
        `
          SELECT id, user_id, tanda_id, role, rotation_position, is_defaulter
          FROM participants
          WHERE tanda_id = ? AND rotation_position = ?
        `,
      )
      .get(tandaId, rotationPosition) as ParticipantRow | undefined;

    return row ? mapParticipantRow(row) : null;
  }

  private findContributionById(id: number): ContributionRecord {
    const row = db
      .prepare(
        `
          SELECT id, tanda_id, participant_id, round, amount, penalty_amount, status, paid_at
          FROM contributions
          WHERE id = ?
        `,
      )
      .get(id) as ContributionRow | undefined;

    if (!row) {
      throw new InternalInvariantError(`Contribution ${id} was created but could not be reloaded.`);
    }

    return mapContributionRow(row);
  }

  private findContributionByParticipantAndRound(
    tandaId: number,
    participantId: number,
    round: number,
  ): ContributionRecord | null {
    const row = db
      .prepare(
        `
          SELECT id, tanda_id, participant_id, round, amount, penalty_amount, status, paid_at
          FROM contributions
          WHERE tanda_id = ? AND participant_id = ? AND round = ?
        `,
      )
      .get(tandaId, participantId, round) as ContributionRow | undefined;

    return row ? mapContributionRow(row) : null;
  }

  private listContributionsForRound(tandaId: number, round: number): ContributionRecord[] {
    const rows = db
      .prepare(
        `
          SELECT
            c.id,
            c.tanda_id,
            c.participant_id,
            c.round,
            c.amount,
            c.penalty_amount,
            c.status,
            c.paid_at
          FROM contributions c
          INNER JOIN participants p ON p.id = c.participant_id
          WHERE c.tanda_id = ? AND c.round = ?
          ORDER BY p.rotation_position ASC, c.id ASC
        `,
      )
      .all(tandaId, round) as ContributionRow[];

    return rows.map(mapContributionRow);
  }

  private markMissingContributionsForRound(tandaId: number, round: number, amount: number): void {
    const participants = this.listParticipants(tandaId);
    const insertMissed = db.prepare(
      `
        INSERT INTO contributions (tanda_id, participant_id, round, amount, penalty_amount, status, paid_at)
        VALUES (?, ?, ?, ?, 0, 'missed', NULL)
      `,
    );

    for (const participant of participants) {
      const existingContribution = this.findContributionByParticipantAndRound(tandaId, participant.id, round);
      if (!existingContribution) {
        insertMissed.run(tandaId, participant.id, round, amount);
      }
    }
  }

  private refreshDefaulterFlags(tandaId: number): void {
    const participants = this.listParticipants(tandaId);
    const updateStatement = db.prepare("UPDATE participants SET is_defaulter = ? WHERE id = ?");

    for (const participant of participants) {
      const lastTwoRows = db
        .prepare(
          `
            SELECT status
            FROM contributions
            WHERE tanda_id = ? AND participant_id = ?
            ORDER BY round DESC, id DESC
            LIMIT 2
          `,
        )
        .all(tandaId, participant.id) as Array<{ status: ContributionRecord["status"] }>;

      const isDefaulter =
        lastTwoRows.length === 2 && lastTwoRows.every((contribution) => contribution.status === "missed");

      updateStatement.run(isDefaulter ? 1 : 0, participant.id);
    }
  }

  private isContributionLate(roundStartedAt: string | null, paidAt: string): boolean {
    if (!roundStartedAt) {
      return false;
    }

    const roundStartTimestamp = new Date(roundStartedAt).getTime();
    const paidTimestamp = new Date(paidAt).getTime();
    const windowEndsAt = roundStartTimestamp + businessConfig.roundWindowHours * 60 * 60 * 1000;

    return paidTimestamp > windowEndsAt;
  }

  private findByIdOrThrow(id: number): TandaRecord {
    const tanda = this.findById(id);

    if (!tanda) {
      throw new InternalInvariantError(`Tanda ${id} was created but could not be reloaded.`);
    }

    return tanda;
  }

  private findStateByIdOrThrow(id: number): TandaState {
    const tanda = this.findStateById(id);

    if (!tanda) {
      throw new InternalInvariantError(`Tanda ${id} was expected but could not be reloaded.`);
    }

    return tanda;
  }
}

function mapTandaRow(row: TandaRow): TandaRecord {
  return {
    id: row.id,
    name: row.name,
    organizerId: row.organizer_id,
    contributionAmount: row.contribution_amount,
    status: row.status,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
  };
}

function mapParticipantRow(row: ParticipantRow): ParticipantRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role,
    rotationPosition: row.rotation_position,
    isDefaulter: row.is_defaulter === 1,
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
    paidAt: row.paid_at,
  };
}

function mapTandaStateRow(row: TandaRow): TandaState {
  return {
    ...mapTandaRow(row),
    roundStartedAt: row.round_started_at,
  };
}