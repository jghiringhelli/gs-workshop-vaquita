import { v4 as uuidv4 } from "uuid";
import { db } from "../db/database";

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: "pending" | "paid" | "late" | "missed";
}

export const contributionRepository = {
  create(data: {
    tandaId: string;
    participantId: string;
    round: number;
    amount: number;
    status: Contribution["status"];
  }): Contribution {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO contributions (id, tandaId, participantId, round, amount, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, data.tandaId, data.participantId, data.round, data.amount, data.status);
    return { id, ...data };
  },

  findByParticipantAndRound(
    participantId: string,
    round: number,
  ): Contribution | undefined {
    return db
      .prepare(
        "SELECT * FROM contributions WHERE participantId = ? AND round = ?",
      )
      .get(participantId, round) as Contribution | undefined;
  },

  findByTandaAndRound(tandaId: string, round: number): Contribution[] {
    return db
      .prepare(
        "SELECT * FROM contributions WHERE tandaId = ? AND round = ?",
      )
      .all(tandaId, round) as Contribution[];
  },

  getHistoryByParticipant(participantId: string): Contribution[] {
    return db
      .prepare(
        "SELECT * FROM contributions WHERE participantId = ? ORDER BY round ASC",
      )
      .all(participantId) as Contribution[];
  },

  /**
   * Counts how many consecutive 'missed' contributions a participant has,
   * looking backwards from the most recent round.
   */
  countConsecutiveMissed(participantId: string): number {
    const rows = db
      .prepare(
        `SELECT status FROM contributions
         WHERE participantId = ?
         ORDER BY round DESC`,
      )
      .all(participantId) as { status: string }[];

    let count = 0;
    for (const row of rows) {
      if (row.status === "missed") {
        count++;
      } else {
        break;
      }
    }
    return count;
  },

  updateStatus(id: string, status: Contribution["status"]): void {
    db.prepare("UPDATE contributions SET status = ? WHERE id = ?").run(
      status,
      id,
    );
  },
};
