import { type DatabaseConnection } from "../db/database";

import {
  type Contribution,
  type ContributionStatus,
  type CreateParticipantInput,
  type CreateTandaInput,
  type Participant,
  type ParticipantRole,
  type Tanda,
  type TandaStatus,
} from "../tandas/tanda.types";

interface TandaRow {
  id: number;
  name: string;
  organizer_id: number;
  contribution_amount: number;
  status: TandaStatus;
  current_round: number;
  total_rounds: number;
}

interface ParticipantRow {
  id: number;
  user_id: number;
  tanda_id: number;
  role: ParticipantRole;
  rotation_position: number | null;
}

interface ContributionRow {
  id: number;
  tanda_id: number;
  participant_id: number;
  round: number;
  amount: number;
  status: ContributionStatus;
  penalty_amount: number;
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
  };
}

function mapParticipantRow(row: ParticipantRow): Participant {
  return {
    id: row.id,
    userId: row.user_id,
    tandaId: row.tanda_id,
    role: row.role,
    rotationPosition: row.rotation_position,
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
  };
}

export class TandaRepository {
  constructor(private readonly db: DatabaseConnection) {}

  runInTransaction<T>(operation: () => T): T {
    const transaction = this.db.transaction(operation);

    return transaction();
  }

  userExists(userId: number): boolean {
    const statement = this.db.prepare(`
      SELECT id
      FROM users
      WHERE id = ?
    `);

    const row = statement.get(userId) as { id: number } | undefined;

    return row !== undefined;
  }

  createTanda(input: CreateTandaInput): Tanda {
    const statement = this.db.prepare(`
      INSERT INTO tandas (name, organizer_id, contribution_amount, status, current_round, total_rounds, updated_at)
      VALUES (@name, @organizerId, @contributionAmount, 'forming', 0, 1, CURRENT_TIMESTAMP)
    `);

    const result = statement.run(input);

    return this.findTandaById(Number(result.lastInsertRowid)) as Tanda;
  }

  listTandas(userId?: number): Tanda[] {
    const statement = typeof userId === "number"
      ? this.db.prepare(`
          SELECT DISTINCT t.id, t.name, t.organizer_id, t.contribution_amount, t.status, t.current_round, t.total_rounds
          FROM tandas t
          INNER JOIN participants p ON p.tanda_id = t.id
          WHERE p.user_id = ?
          ORDER BY t.id ASC
        `)
      : this.db.prepare(`
          SELECT id, name, organizer_id, contribution_amount, status, current_round, total_rounds
          FROM tandas
          ORDER BY id ASC
        `);

    const rows = (typeof userId === "number" ? statement.all(userId) : statement.all()) as TandaRow[];

    return rows.map(mapTandaRow);
  }

  findTandaById(id: number): Tanda | undefined {
    const statement = this.db.prepare(`
      SELECT id, name, organizer_id, contribution_amount, status, current_round, total_rounds
      FROM tandas
      WHERE id = ?
    `);

    const row = statement.get(id) as TandaRow | undefined;

    return row ? mapTandaRow(row) : undefined;
  }

  createParticipant(input: CreateParticipantInput): Participant {
    const statement = this.db.prepare(`
      INSERT INTO participants (user_id, tanda_id, role, rotation_position)
      VALUES (@userId, @tandaId, @role, @rotationPosition)
    `);

    const result = statement.run({
      ...input,
      rotationPosition: input.rotationPosition,
    });

    return this.findParticipantById(Number(result.lastInsertRowid)) as Participant;
  }

  listParticipantsByTandaId(tandaId: number): Participant[] {
    const statement = this.db.prepare(`
      SELECT id, user_id, tanda_id, role, rotation_position
      FROM participants
      WHERE tanda_id = ?
      ORDER BY
        CASE WHEN rotation_position IS NULL THEN 1 ELSE 0 END ASC,
        rotation_position ASC,
        id ASC
    `);

    const rows = statement.all(tandaId) as ParticipantRow[];

    return rows.map(mapParticipantRow);
  }

  findParticipantById(id: number): Participant | undefined {
    const statement = this.db.prepare(`
      SELECT id, user_id, tanda_id, role, rotation_position
      FROM participants
      WHERE id = ?
    `);

    const row = statement.get(id) as ParticipantRow | undefined;

    return row ? mapParticipantRow(row) : undefined;
  }

  findParticipantByUserAndTanda(tandaId: number, userId: number): Participant | undefined {
    const statement = this.db.prepare(`
      SELECT id, user_id, tanda_id, role, rotation_position
      FROM participants
      WHERE tanda_id = ? AND user_id = ?
    `);

    const row = statement.get(tandaId, userId) as ParticipantRow | undefined;

    return row ? mapParticipantRow(row) : undefined;
  }

  countParticipants(tandaId: number): number {
    const statement = this.db.prepare(`
      SELECT COUNT(*) AS count
      FROM participants
      WHERE tanda_id = ?
    `);

    const row = statement.get(tandaId) as { count: number };

    return row.count;
  }

  updateTandaState(input: { id: number; status: TandaStatus; currentRound: number; totalRounds: number }): void {
    const statement = this.db.prepare(`
      UPDATE tandas
      SET
        status = @status,
        current_round = @currentRound,
        total_rounds = @totalRounds,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);

    statement.run(input);
  }

  updateParticipantRotationPositions(input: Array<{ participantId: number; rotationPosition: number }>): void {
    const statement = this.db.prepare(`
      UPDATE participants
      SET rotation_position = @rotationPosition
      WHERE id = @participantId
    `);

    for (const participant of input) {
      statement.run(participant);
    }
  }

  createPendingContributions(tandaId: number, round: number, participantIds: number[], amount: number): void {
    const statement = this.db.prepare(`
      INSERT INTO contributions (tanda_id, participant_id, round, amount, penalty_amount, status)
      VALUES (@tandaId, @participantId, @round, @amount, 0, 'pending')
    `);

    for (const participantId of participantIds) {
      statement.run({
        tandaId,
        participantId,
        round,
        amount,
      });
    }
  }

  findContributionById(id: number): Contribution | undefined {
    const statement = this.db.prepare(`
      SELECT id, tanda_id, participant_id, round, amount, status, penalty_amount
      FROM contributions
      WHERE id = ?
    `);

    const row = statement.get(id) as ContributionRow | undefined;

    return row ? mapContributionRow(row) : undefined;
  }

  findContributionByParticipantAndRound(participantId: number, round: number): Contribution | undefined {
    const statement = this.db.prepare(`
      SELECT id, tanda_id, participant_id, round, amount, status, penalty_amount
      FROM contributions
      WHERE participant_id = ? AND round = ?
    `);

    const row = statement.get(participantId, round) as ContributionRow | undefined;

    return row ? mapContributionRow(row) : undefined;
  }

  updateContributionStatus(input: { id: number; status: ContributionStatus; penaltyAmount: number }): Contribution {
    const statement = this.db.prepare(`
      UPDATE contributions
      SET
        status = @status,
        penalty_amount = @penaltyAmount
      WHERE id = @id
    `);

    statement.run(input);

    return this.findContributionById(input.id) as Contribution;
  }

  markPendingContributionsAsMissed(tandaId: number, round: number): void {
    const statement = this.db.prepare(`
      UPDATE contributions
      SET
        status = 'missed',
        penalty_amount = 0
      WHERE tanda_id = ? AND round = ? AND status = 'pending'
    `);

    statement.run(tandaId, round);
  }

  listContributionsForRound(tandaId: number, round: number): Contribution[] {
    const statement = this.db.prepare(`
      SELECT id, tanda_id, participant_id, round, amount, status, penalty_amount
      FROM contributions
      WHERE tanda_id = ? AND round = ?
      ORDER BY participant_id ASC
    `);

    const rows = statement.all(tandaId, round) as ContributionRow[];

    return rows.map(mapContributionRow);
  }

  listContributionsForParticipant(tandaId: number, participantId: number): Contribution[] {
    const statement = this.db.prepare(`
      SELECT id, tanda_id, participant_id, round, amount, status, penalty_amount
      FROM contributions
      WHERE tanda_id = ? AND participant_id = ?
      ORDER BY round ASC
    `);

    const rows = statement.all(tandaId, participantId) as ContributionRow[];

    return rows.map(mapContributionRow);
  }

  findRecipientByRound(tandaId: number, round: number): Participant | undefined {
    const statement = this.db.prepare(`
      SELECT id, user_id, tanda_id, role, rotation_position
      FROM participants
      WHERE tanda_id = ? AND rotation_position = ?
    `);

    const row = statement.get(tandaId, round) as ParticipantRow | undefined;

    return row ? mapParticipantRow(row) : undefined;
  }
}
