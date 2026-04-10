import { InternalServerError } from "../errors/app-error";
import type {
  Contribution,
  ContributionRow,
  CreateTandaInput,
  Participant,
  ParticipantRow,
  RotationAssignment,
  Tanda,
  TandaRow,
} from "./tanda.types";
import { mapContributionRow, mapParticipantRow, mapTandaRow } from "./tanda.types";

type DatabaseConnection = import("better-sqlite3").Database;

export class TandasRepository {
  constructor(private readonly db: DatabaseConnection) {}

  createTanda(input: CreateTandaInput): Tanda {
    const create = this.db.transaction((value: CreateTandaInput) => {
      const insertTanda = this.db.prepare<{ name: string; organizerId: number; contributionAmount: number }>(
        `
          INSERT INTO tandas (name, organizer_id, contribution_amount, total_rounds)
          VALUES (@name, @organizerId, @contributionAmount, 1)
        `,
      );
      const tandaResult = insertTanda.run({
        name: value.name,
        organizerId: value.organizerId,
        contributionAmount: value.contributionAmount,
      });
      const tandaId = Number(tandaResult.lastInsertRowid);

      const insertParticipant = this.db.prepare<{ userId: number; tandaId: number }>(
        `
          INSERT INTO participants (user_id, tanda_id, role)
          VALUES (@userId, @tandaId, 'organizer')
        `,
      );
      insertParticipant.run({
        userId: value.organizerId,
        tandaId,
      });

      return tandaId;
    });

    return this.requireTanda(create(input), "Tanda creation completed without returning a persisted record");
  }

  findById(id: number): Tanda | null {
    const statement = this.db.prepare<[number], TandaRow>(
      `
        SELECT
          id,
          name,
          organizer_id,
          contribution_amount,
          status,
          current_round,
          total_rounds,
          current_round_started_at,
          created_at,
          updated_at
        FROM tandas
        WHERE id = ?
      `,
    );

    const row = statement.get(id);

    return row ? mapTandaRow(row) : null;
  }

  listByUserId(userId: number): Tanda[] {
    const statement = this.db.prepare<[number], TandaRow>(
      `
        SELECT DISTINCT
          t.id,
          t.name,
          t.organizer_id,
          t.contribution_amount,
          t.status,
          t.current_round,
          t.total_rounds,
          t.current_round_started_at,
          t.created_at,
          t.updated_at
        FROM tandas t
        INNER JOIN participants p ON p.tanda_id = t.id
        WHERE p.user_id = ?
        ORDER BY t.id ASC
      `,
    );

    return statement.all(userId).map(mapTandaRow);
  }

  countParticipants(tandaId: number): number {
    const statement = this.db.prepare<[number], { count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM participants
        WHERE tanda_id = ?
      `,
    );

    return statement.get(tandaId)?.count ?? 0;
  }

  listParticipants(tandaId: number): Participant[] {
    const statement = this.db.prepare<[number], ParticipantRow>(
      `
        SELECT
          id,
          user_id,
          tanda_id,
          role,
          rotation_position,
          consecutive_missed_contributions,
          is_defaulter,
          created_at
        FROM participants
        WHERE tanda_id = ?
        ORDER BY
          CASE WHEN rotation_position IS NULL THEN 1 ELSE 0 END ASC,
          rotation_position ASC,
          id ASC
      `,
    );

    return statement.all(tandaId).map(mapParticipantRow);
  }

  findParticipantByUserId(tandaId: number, userId: number): Participant | null {
    const statement = this.db.prepare<[number, number], ParticipantRow>(
      `
        SELECT
          id,
          user_id,
          tanda_id,
          role,
          rotation_position,
          consecutive_missed_contributions,
          is_defaulter,
          created_at
        FROM participants
        WHERE tanda_id = ? AND user_id = ?
      `,
    );

    const row = statement.get(tandaId, userId);

    return row ? mapParticipantRow(row) : null;
  }

  addMember(tandaId: number, userId: number): Participant {
    const addMember = this.db.transaction((currentTandaId: number, currentUserId: number) => {
      const insertParticipant = this.db.prepare<{ tandaId: number; userId: number }>(
        `
          INSERT INTO participants (tanda_id, user_id, role)
          VALUES (@tandaId, @userId, 'member')
        `,
      );
      const participantResult = insertParticipant.run({
        tandaId: currentTandaId,
        userId: currentUserId,
      });
      const participantId = Number(participantResult.lastInsertRowid);

      this.db
        .prepare<[number, number]>(
          `
            UPDATE tandas
            SET total_rounds = (
              SELECT COUNT(*)
              FROM participants
              WHERE tanda_id = ?
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
        )
        .run(currentTandaId, currentTandaId);

      return participantId;
    });

    return this.requireParticipant(
      addMember(tandaId, userId),
      "Participant creation completed without returning a persisted record",
    );
  }

  startTanda(tandaId: number, contributionAmount: number, assignments: RotationAssignment[]): Tanda {
    const start = this.db.transaction(() => {
      const updateParticipant = this.db.prepare<{ position: number; participantId: number }>(
        `
          UPDATE participants
          SET rotation_position = @position
          WHERE id = @participantId
        `,
      );
      const insertContribution = this.db.prepare<{
        tandaId: number;
        participantId: number;
        round: number;
        amount: number;
      }>(
        `
          INSERT INTO contributions (
            tanda_id,
            participant_id,
            round,
            base_amount,
            penalty_amount,
            total_amount,
            status
          )
          VALUES (
            @tandaId,
            @participantId,
            @round,
            @amount,
            0,
            @amount,
            'pending'
          )
        `,
      );

      for (const assignment of assignments) {
        updateParticipant.run({
          position: assignment.rotationPosition,
          participantId: assignment.participantId,
        });

        insertContribution.run({
          tandaId,
          participantId: assignment.participantId,
          round: 1,
          amount: contributionAmount,
        });
      }

      this.db
        .prepare<{ tandaId: number; totalRounds: number }>(
          `
            UPDATE tandas
            SET
              status = 'active',
              current_round = 1,
              total_rounds = @totalRounds,
              current_round_started_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = @tandaId
          `,
        )
        .run({
          tandaId,
          totalRounds: assignments.length,
        });
    });

    start();

    return this.requireTanda(tandaId, "Tanda start completed without returning an updated record");
  }

  cancelTanda(tandaId: number): Tanda {
    this.db
      .prepare<[number]>(
        `
          UPDATE tandas
          SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      )
      .run(tandaId);

    return this.requireTanda(tandaId, "Tanda cancellation completed without returning an updated record");
  }

  findParticipantById(id: number): Participant | null {
    const statement = this.db.prepare<[number], ParticipantRow>(
      `
        SELECT
          id,
          user_id,
          tanda_id,
          role,
          rotation_position,
          consecutive_missed_contributions,
          is_defaulter,
          created_at
        FROM participants
        WHERE id = ?
      `,
    );

    const row = statement.get(id);

    return row ? mapParticipantRow(row) : null;
  }

  findContribution(tandaId: number, participantId: number, round: number): Contribution | null {
    const statement = this.db.prepare<[number, number, number], ContributionRow>(
      `
        SELECT
          id,
          tanda_id,
          participant_id,
          round,
          base_amount,
          penalty_amount,
          total_amount,
          status,
          paid_at,
          created_at
        FROM contributions
        WHERE tanda_id = ? AND participant_id = ? AND round = ?
      `,
    );

    const row = statement.get(tandaId, participantId, round);

    return row ? mapContributionRow(row) : null;
  }

  listRoundContributions(tandaId: number, round: number): Contribution[] {
    const statement = this.db.prepare<[number, number], ContributionRow>(
      `
        SELECT
          id,
          tanda_id,
          participant_id,
          round,
          base_amount,
          penalty_amount,
          total_amount,
          status,
          paid_at,
          created_at
        FROM contributions
        WHERE tanda_id = ? AND round = ?
        ORDER BY participant_id ASC
      `,
    );

    return statement.all(tandaId, round).map(mapContributionRow);
  }

  listParticipantContributionHistory(tandaId: number, participantId: number): Contribution[] {
    const statement = this.db.prepare<[number, number], ContributionRow>(
      `
        SELECT
          id,
          tanda_id,
          participant_id,
          round,
          base_amount,
          penalty_amount,
          total_amount,
          status,
          paid_at,
          created_at
        FROM contributions
        WHERE tanda_id = ? AND participant_id = ?
        ORDER BY round ASC
      `,
    );

    return statement.all(tandaId, participantId).map(mapContributionRow);
  }

  recordContribution(
    tandaId: number,
    participantId: number,
    round: number,
    status: "paid" | "late",
    penaltyAmount: number,
    totalAmount: number,
  ): Contribution {
    const record = this.db.transaction(() => {
      this.db
        .prepare<{
          tandaId: number;
          participantId: number;
          round: number;
          status: "paid" | "late";
          penaltyAmount: number;
          totalAmount: number;
        }>(
          `
            UPDATE contributions
            SET
              status = @status,
              penalty_amount = @penaltyAmount,
              total_amount = @totalAmount,
              paid_at = CURRENT_TIMESTAMP
            WHERE tanda_id = @tandaId AND participant_id = @participantId AND round = @round
          `,
        )
        .run({
          tandaId,
          participantId,
          round,
          status,
          penaltyAmount,
          totalAmount,
        });

      this.db
        .prepare<[number]>(
          `
            UPDATE participants
            SET consecutive_missed_contributions = 0, is_defaulter = 0
            WHERE id = ?
          `,
        )
        .run(participantId);
    });

    record();

    return this.requireContribution(
      tandaId,
      participantId,
      round,
      "Contribution update completed without returning a persisted record",
    );
  }

  advanceRound(tanda: Tanda, participants: Participant[]): Tanda {
    const advance = this.db.transaction(() => {
      const pendingParticipants = this.db
        .prepare<[number, number], { participant_id: number }>(
          `
            SELECT participant_id
            FROM contributions
            WHERE tanda_id = ? AND round = ? AND status = 'pending'
          `,
        )
        .all(tanda.id, tanda.currentRound);

      this.db
        .prepare<[number, number]>(
          `
            UPDATE contributions
            SET status = 'missed'
            WHERE tanda_id = ? AND round = ? AND status = 'pending'
          `,
        )
        .run(tanda.id, tanda.currentRound);

      const incrementMissed = this.db.prepare<[number]>(
        `
          UPDATE participants
          SET
            consecutive_missed_contributions = consecutive_missed_contributions + 1,
            is_defaulter = CASE
              WHEN consecutive_missed_contributions + 1 >= 2 THEN 1
              ELSE 0
            END
          WHERE id = ?
        `,
      );

      for (const pendingParticipant of pendingParticipants) {
        incrementMissed.run(pendingParticipant.participant_id);
      }

      if (tanda.currentRound >= tanda.totalRounds) {
        this.db
          .prepare<[number]>(
            `
              UPDATE tandas
              SET
                status = 'completed',
                current_round_started_at = NULL,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
          )
          .run(tanda.id);

        return;
      }

      const nextRound = tanda.currentRound + 1;
      const insertContribution = this.db.prepare<{
        tandaId: number;
        participantId: number;
        round: number;
        amount: number;
      }>(
        `
          INSERT INTO contributions (
            tanda_id,
            participant_id,
            round,
            base_amount,
            penalty_amount,
            total_amount,
            status
          )
          VALUES (
            @tandaId,
            @participantId,
            @round,
            @amount,
            0,
            @amount,
            'pending'
          )
        `,
      );

      for (const participant of participants) {
        insertContribution.run({
          tandaId: tanda.id,
          participantId: participant.id,
          round: nextRound,
          amount: tanda.contributionAmount,
        });
      }

      this.db
        .prepare<{ tandaId: number; nextRound: number }>(
          `
            UPDATE tandas
            SET
              current_round = @nextRound,
              current_round_started_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = @tandaId
          `,
        )
        .run({
          tandaId: tanda.id,
          nextRound,
        });
    });

    advance();

    return this.requireTanda(tanda.id, "Round advancement completed without returning an updated record");
  }

  private requireTanda(id: number, message: string): Tanda {
    const tanda = this.findById(id);

    if (!tanda) {
      throw new InternalServerError(message);
    }

    return tanda;
  }

  private requireParticipant(id: number, message: string): Participant {
    const participant = this.findParticipantById(id);

    if (!participant) {
      throw new InternalServerError(message);
    }

    return participant;
  }

  private requireContribution(
    tandaId: number,
    participantId: number,
    round: number,
    message: string,
  ): Contribution {
    const contribution = this.findContribution(tandaId, participantId, round);

    if (!contribution) {
      throw new InternalServerError(message);
    }

    return contribution;
  }
}
