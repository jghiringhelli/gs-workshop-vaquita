import Database from "better-sqlite3";
import { Contribution, ContributionView, Participant, Tanda, TandaStatus, TandaSummary } from "../domain";

interface TandaRow {
  id: number;
  name: string;
  organizer_id: number;
  contribution_amount: number;
  status: TandaStatus;
  current_round: number;
  total_rounds: number;
}

interface TandaSummaryRow extends TandaRow {
  participants_count: number;
}

interface ParticipantRow {
  id: number;
  user_id: number;
  tanda_id: number;
  role: "organizer" | "member";
  rotation_position: number | null;
  name: string;
  email: string;
}

interface ContributionRow {
  id: number;
  tanda_id: number;
  participant_id: number;
  round: number;
  amount: number;
  penalty_amount: number;
  status: "pending" | "paid" | "late" | "missed";
  paid_at: string | null;
}

interface ContributionViewRow extends ContributionRow {
  participant_name: string;
  participant_email: string;
}

const mapTanda = (row: TandaRow): Tanda => ({
  id: row.id,
  name: row.name,
  organizerId: row.organizer_id,
  contributionAmount: row.contribution_amount,
  status: row.status,
  currentRound: row.current_round,
  totalRounds: row.total_rounds,
});

const mapParticipant = (row: ParticipantRow): Participant => ({
  id: row.id,
  userId: row.user_id,
  tandaId: row.tanda_id,
  role: row.role,
  rotationPosition: row.rotation_position,
  name: row.name,
  email: row.email,
});

const mapContribution = (row: ContributionRow): Contribution => ({
  id: row.id,
  tandaId: row.tanda_id,
  participantId: row.participant_id,
  round: row.round,
  amount: row.amount,
  penaltyAmount: row.penalty_amount,
  status: row.status,
  paidAt: row.paid_at,
});

const mapContributionView = (row: ContributionViewRow): ContributionView => ({
  ...mapContribution(row),
  participantName: row.participant_name,
  participantEmail: row.participant_email,
});

export class TandaRepository {
  constructor(private readonly db: Database.Database) {}

  runInTransaction<T>(work: () => T): T {
    return this.db.transaction(work)();
  }

  createTanda(input: { name: string; organizerId: number; contributionAmount: number }): Tanda {
    const result = this.db
      .prepare(
        `
        INSERT INTO tandas (name, organizer_id, contribution_amount, status, current_round, total_rounds)
        VALUES (?, ?, ?, 'forming', 0, 1)
        `,
      )
      .run(input.name, input.organizerId, input.contributionAmount);

    return this.findTandaById(Number(result.lastInsertRowid)) as Tanda;
  }

  findTandaById(id: number): Tanda | null {
    const row = this.db
      .prepare(
        `
        SELECT id, name, organizer_id, contribution_amount, status, current_round, total_rounds
        FROM tandas
        WHERE id = ?
        `,
      )
      .get(id) as TandaRow | undefined;

    return row ? mapTanda(row) : null;
  }

  listTandasForUser(userId: number): TandaSummary[] {
    const rows = this.db
      .prepare(
        `
        SELECT
          t.id,
          t.name,
          t.organizer_id,
          t.contribution_amount,
          t.status,
          t.current_round,
          t.total_rounds,
          COUNT(p.id) AS participants_count
        FROM tandas t
        INNER JOIN participants membership
          ON membership.tanda_id = t.id
         AND membership.user_id = ?
        LEFT JOIN participants p
          ON p.tanda_id = t.id
        GROUP BY t.id
        ORDER BY t.id
        `,
      )
      .all(userId) as TandaSummaryRow[];

    return rows.map((row) => ({
      ...mapTanda(row),
      participantsCount: row.participants_count,
    }));
  }

  updateTandaState(input: {
    tandaId: number;
    status?: TandaStatus;
    currentRound?: number;
    totalRounds?: number;
  }): Tanda {
    const current = this.findTandaById(input.tandaId) as Tanda;
    const status = input.status ?? current.status;
    const currentRound = input.currentRound ?? current.currentRound;
    const totalRounds = input.totalRounds ?? current.totalRounds;

    this.db
      .prepare(
        `
        UPDATE tandas
        SET status = ?, current_round = ?, total_rounds = ?
        WHERE id = ?
        `,
      )
      .run(status, currentRound, totalRounds, input.tandaId);

    return this.findTandaById(input.tandaId) as Tanda;
  }

  createParticipant(input: {
    userId: number;
    tandaId: number;
    role: "organizer" | "member";
    rotationPosition?: number | null;
  }): Participant {
    const result = this.db
      .prepare(
        `
        INSERT INTO participants (user_id, tanda_id, role, rotation_position)
        VALUES (?, ?, ?, ?)
        `,
      )
      .run(input.userId, input.tandaId, input.role, input.rotationPosition ?? null);

    return this.findParticipantById(input.tandaId, Number(result.lastInsertRowid)) as Participant;
  }

  countParticipants(tandaId: number): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS count FROM participants WHERE tanda_id = ?")
      .get(tandaId) as { count: number };

    return row.count;
  }

  listParticipants(tandaId: number): Participant[] {
    const rows = this.db
      .prepare(
        `
        SELECT
          p.id,
          p.user_id,
          p.tanda_id,
          p.role,
          p.rotation_position,
          u.name,
          u.email
        FROM participants p
        INNER JOIN users u ON u.id = p.user_id
        WHERE p.tanda_id = ?
        ORDER BY
          CASE WHEN p.rotation_position IS NULL THEN 1 ELSE 0 END,
          p.rotation_position,
          p.id
        `,
      )
      .all(tandaId) as ParticipantRow[];

    return rows.map(mapParticipant);
  }

  findParticipantByUser(tandaId: number, userId: number): Participant | null {
    const row = this.db
      .prepare(
        `
        SELECT
          p.id,
          p.user_id,
          p.tanda_id,
          p.role,
          p.rotation_position,
          u.name,
          u.email
        FROM participants p
        INNER JOIN users u ON u.id = p.user_id
        WHERE p.tanda_id = ? AND p.user_id = ?
        `,
      )
      .get(tandaId, userId) as ParticipantRow | undefined;

    return row ? mapParticipant(row) : null;
  }

  findParticipantById(tandaId: number, participantId: number): Participant | null {
    const row = this.db
      .prepare(
        `
        SELECT
          p.id,
          p.user_id,
          p.tanda_id,
          p.role,
          p.rotation_position,
          u.name,
          u.email
        FROM participants p
        INNER JOIN users u ON u.id = p.user_id
        WHERE p.tanda_id = ? AND p.id = ?
        `,
      )
      .get(tandaId, participantId) as ParticipantRow | undefined;

    return row ? mapParticipant(row) : null;
  }

  assignRotationPositions(tandaId: number, participantIdsInOrder: number[]): void {
    const statement = this.db.prepare(
      "UPDATE participants SET rotation_position = ? WHERE tanda_id = ? AND id = ?",
    );

    participantIdsInOrder.forEach((participantId, index) => {
      statement.run(index + 1, tandaId, participantId);
    });
  }

  createPendingContributions(tandaId: number, round: number): void {
    const participantIds = this.db
      .prepare("SELECT id FROM participants WHERE tanda_id = ? ORDER BY id")
      .all(tandaId) as Array<{ id: number }>;

    const statement = this.db.prepare(
      `
      INSERT OR IGNORE INTO contributions (tanda_id, participant_id, round, amount, penalty_amount, status, paid_at)
      VALUES (?, ?, ?, 0, 0, 'pending', NULL)
      `,
    );

    participantIds.forEach(({ id }) => {
      statement.run(tandaId, id, round);
    });
  }

  findContribution(tandaId: number, participantId: number, round: number): Contribution | null {
    const row = this.db
      .prepare(
        `
        SELECT id, tanda_id, participant_id, round, amount, penalty_amount, status, paid_at
        FROM contributions
        WHERE tanda_id = ? AND participant_id = ? AND round = ?
        `,
      )
      .get(tandaId, participantId, round) as ContributionRow | undefined;

    return row ? mapContribution(row) : null;
  }

  updateContribution(input: {
    contributionId: number;
    amount: number;
    penaltyAmount: number;
    status: "paid" | "late";
    paidAt: string;
  }): Contribution {
    this.db
      .prepare(
        `
        UPDATE contributions
        SET amount = ?, penalty_amount = ?, status = ?, paid_at = ?
        WHERE id = ?
        `,
      )
      .run(input.amount, input.penaltyAmount, input.status, input.paidAt, input.contributionId);

    const row = this.db
      .prepare(
        `
        SELECT id, tanda_id, participant_id, round, amount, penalty_amount, status, paid_at
        FROM contributions
        WHERE id = ?
        `,
      )
      .get(input.contributionId) as ContributionRow;

    return mapContribution(row);
  }

  listRoundContributions(tandaId: number, round: number): ContributionView[] {
    const rows = this.db
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
          c.paid_at,
          u.name AS participant_name,
          u.email AS participant_email
        FROM contributions c
        INNER JOIN participants p ON p.id = c.participant_id
        INNER JOIN users u ON u.id = p.user_id
        WHERE c.tanda_id = ? AND c.round = ?
        ORDER BY c.participant_id
        `,
      )
      .all(tandaId, round) as ContributionViewRow[];

    return rows.map(mapContributionView);
  }

  markPendingContributionsMissed(tandaId: number, round: number): void {
    this.db
      .prepare(
        `
        UPDATE contributions
        SET status = 'missed'
        WHERE tanda_id = ? AND round = ? AND status = 'pending'
        `,
      )
      .run(tandaId, round);
  }

  getRoundRecipient(tandaId: number, round: number): Participant | null {
    const row = this.db
      .prepare(
        `
        SELECT
          p.id,
          p.user_id,
          p.tanda_id,
          p.role,
          p.rotation_position,
          u.name,
          u.email
        FROM participants p
        INNER JOIN users u ON u.id = p.user_id
        WHERE p.tanda_id = ? AND p.rotation_position = ?
        `,
      )
      .get(tandaId, round) as ParticipantRow | undefined;

    return row ? mapParticipant(row) : null;
  }

  listParticipantHistory(tandaId: number, participantId: number): Contribution[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, tanda_id, participant_id, round, amount, penalty_amount, status, paid_at
        FROM contributions
        WHERE tanda_id = ? AND participant_id = ?
        ORDER BY round
        `,
      )
      .all(tandaId, participantId) as ContributionRow[];

    return rows.map(mapContribution);
  }
}
