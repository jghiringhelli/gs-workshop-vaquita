import { getDb } from "../db/database";
import type { Contribution, ContributionStatus } from "../domain/models";

interface ContributionRow {
  id: number;
  tanda_id: number;
  participant_id: number;
  round: number;
  amount: number;
  status: ContributionStatus;
}

function toContribution(row: ContributionRow): Contribution {
  return {
    id: row.id,
    tandaId: row.tanda_id,
    participantId: row.participant_id,
    round: row.round,
    amount: row.amount,
    status: row.status,
  };
}

/**
 * Repository for Contribution persistence.
 */
export class ContributionRepository {
  /**
   * Records a contribution for a participant in a given round.
   * @param tandaId - tanda id
   * @param participantId - participant id
   * @param round - round number
   * @param amount - amount contributed
   * @param status - paid | late | missed
   * @returns created Contribution
   */
  create(
    tandaId: number,
    participantId: number,
    round: number,
    amount: number,
    status: ContributionStatus,
  ): Contribution {
    const stmt = getDb().prepare(`
      INSERT INTO contributions (tanda_id, participant_id, round, amount, status)
      VALUES (?, ?, ?, ?, ?) RETURNING *
    `);
    return toContribution(
      stmt.get(tandaId, participantId, round, amount, status) as ContributionRow,
    );
  }

  /**
   * Finds a contribution by participant and round (unique per round).
   * @param participantId - participant id
   * @param round - round number
   * @returns Contribution or null
   */
  findByParticipantAndRound(participantId: number, round: number): Contribution | null {
    const row = getDb()
      .prepare("SELECT * FROM contributions WHERE participant_id = ? AND round = ?")
      .get(participantId, round) as ContributionRow | undefined;
    return row ? toContribution(row) : null;
  }

  /**
   * Returns all contributions for a tanda in a given round.
   * @param tandaId - tanda id
   * @param round - round number
   * @returns Contribution[]
   */
  findByTandaAndRound(tandaId: number, round: number): Contribution[] {
    return (
      getDb()
        .prepare("SELECT * FROM contributions WHERE tanda_id = ? AND round = ? ORDER BY id")
        .all(tandaId, round) as ContributionRow[]
    ).map(toContribution);
  }

  /**
   * Returns all contributions for a specific participant, ordered by round.
   * @param participantId - participant id
   * @returns Contribution[]
   */
  findByParticipantId(participantId: number): Contribution[] {
    return (
      getDb()
        .prepare("SELECT * FROM contributions WHERE participant_id = ? ORDER BY round")
        .all(participantId) as ContributionRow[]
    ).map(toContribution);
  }
}
