import { getDb } from "../db/database";
import { Contribution, ContributionStatus } from "../types";

interface ContributionRow {
  id: number;
  tanda_id: number;
  participant_id: number;
  round: number;
  amount: number;
  status: string;
}

function rowToContribution(row: ContributionRow): Contribution {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    amount: row.amount,
    status: row.status as ContributionStatus,
  };
}

export const contributionRepository = {
  create(
    tandaId: number,
    participantId: number,
    round: number,
    amount: number,
    status: ContributionStatus,
  ): Contribution {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO contributions (tanda_id, participant_id, round, amount, status) VALUES (?, ?, ?, ?, ?)",
    );
    const result = stmt.run(tandaId, participantId, round, amount, status);
    return {
      id: Number(result.lastInsertRowid),
      tandaId,
      participantId,
      round,
      amount,
      status,
    };
  },

  findByTandaAndRound(tandaId: number, round: number): Contribution[] {
    const db = getDb();
    const stmt = db.prepare(
      "SELECT * FROM contributions WHERE tanda_id = ? AND round = ?",
    );
    return (stmt.all(tandaId, round) as ContributionRow[]).map(
      rowToContribution,
    );
  },

  findByParticipant(participantId: number): Contribution[] {
    const db = getDb();
    const stmt = db.prepare(
      "SELECT * FROM contributions WHERE participant_id = ? ORDER BY round",
    );
    return (stmt.all(participantId) as ContributionRow[]).map(
      rowToContribution,
    );
  },

  findByParticipantAndRound(
    participantId: number,
    round: number,
  ): Contribution | undefined {
    const db = getDb();
    const stmt = db.prepare(
      "SELECT * FROM contributions WHERE participant_id = ? AND round = ?",
    );
    const row = stmt.get(participantId, round) as ContributionRow | undefined;
    return row ? rowToContribution(row) : undefined;
  },

  updateStatus(id: number, status: ContributionStatus): void {
    const db = getDb();
    db.prepare("UPDATE contributions SET status = ? WHERE id = ?").run(
      status,
      id,
    );
  },
};
