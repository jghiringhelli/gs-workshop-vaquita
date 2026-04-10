import { db } from "../db/database";
import { Contribution, ContributionStatus, CreateContributionInput } from "../domain/models";

function mapContribution(row: Record<string, unknown>): Contribution {
  return {
    id: Number(row.id),
    tandaId: Number(row.tanda_id),
    participantId: Number(row.participant_id),
    round: Number(row.round),
    amount: Number(row.amount),
    status: row.status as ContributionStatus,
  };
}

export const contributionRepository = {
  create(input: CreateContributionInput): Contribution {
    const insert = db.prepare(
      `INSERT INTO contributions (tanda_id, participant_id, round, amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const result = insert.run(
      input.tandaId,
      input.participantId,
      input.round,
      input.amount,
      input.status,
      new Date().toISOString()
    );
    return this.findById(Number(result.lastInsertRowid)) as Contribution;
  },

  findById(id: number): Contribution | null {
    const row = db.prepare(`SELECT * FROM contributions WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    return row ? mapContribution(row) : null;
  },

  findByParticipantAndRound(participantId: number, round: number): Contribution | null {
    const row = db
      .prepare(`SELECT * FROM contributions WHERE participant_id = ? AND round = ?`)
      .get(participantId, round) as Record<string, unknown> | undefined;
    return row ? mapContribution(row) : null;
  },

  listByTandaAndRound(tandaId: number, round: number): Contribution[] {
    const rows = db
      .prepare(`SELECT * FROM contributions WHERE tanda_id = ? AND round = ? ORDER BY participant_id`)
      .all(tandaId, round) as Record<string, unknown>[];
    return rows.map(mapContribution);
  },

  listByParticipantInTanda(tandaId: number, participantId: number): Contribution[] {
    const rows = db
      .prepare(
        `SELECT *
         FROM contributions
         WHERE tanda_id = ? AND participant_id = ?
         ORDER BY round`
      )
      .all(tandaId, participantId) as Record<string, unknown>[];
    return rows.map(mapContribution);
  },
};
