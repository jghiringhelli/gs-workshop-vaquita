import type { Contribution, ContributionStatus } from "../domain/models";
import { getDatabase } from "../db/database";

interface ContributionRow {
  id: number;
  tanda_id: number;
  participant_id: number;
  round: number;
  amount: number;
  status: ContributionStatus;
  penalty_amount: number;
}

function toContribution(row: ContributionRow): Contribution {
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

export class ContributionRepository {
  create(input: {
    tandaId: number;
    participantId: number;
    round: number;
    amount: number;
    status: ContributionStatus;
    penaltyAmount?: number;
  }): Contribution {
    const db = getDatabase();
    const stmt = db.prepare(
      `INSERT INTO contributions (tanda_id, participant_id, round, amount, status, penalty_amount)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id, tanda_id, participant_id, round, amount, status, penalty_amount`
    );
    const row = stmt.get(
      input.tandaId,
      input.participantId,
      input.round,
      input.amount,
      input.status,
      input.penaltyAmount ?? 0
    ) as ContributionRow;

    return toContribution(row);
  }

  listByRound(tandaId: number, round: number): Contribution[] {
    const db = getDatabase();
    const stmt = db.prepare(
      `SELECT id, tanda_id, participant_id, round, amount, status, penalty_amount
       FROM contributions
       WHERE tanda_id = ? AND round = ?
       ORDER BY id ASC`
    );
    const rows = stmt.all(tandaId, round) as ContributionRow[];
    return rows.map(toContribution);
  }

  listByParticipant(tandaId: number, participantId: number): Contribution[] {
    const db = getDatabase();
    const stmt = db.prepare(
      `SELECT id, tanda_id, participant_id, round, amount, status, penalty_amount
       FROM contributions
       WHERE tanda_id = ? AND participant_id = ?
       ORDER BY round ASC, id ASC`
    );
    const rows = stmt.all(tandaId, participantId) as ContributionRow[];
    return rows.map(toContribution);
  }

  findByRoundAndParticipant(
    tandaId: number,
    participantId: number,
    round: number
  ): Contribution | null {
    const db = getDatabase();
    const stmt = db.prepare(
      `SELECT id, tanda_id, participant_id, round, amount, status, penalty_amount
       FROM contributions
       WHERE tanda_id = ? AND participant_id = ? AND round = ?`
    );
    const row = stmt.get(tandaId, participantId, round) as
      | ContributionRow
      | undefined;
    return row ? toContribution(row) : null;
  }
}
