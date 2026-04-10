import { getDb } from "../db/database.js";

export interface ContributionRow {
  id: number;
  tanda_id: number;
  participant_id: number;
  round: number;
  amount: number;
  status: "pending" | "paid" | "late" | "missed";
  created_at: string;
}

export const contributionRepository = {
  create(
    tandaId: number,
    participantId: number,
    round: number,
    amount: number,
    status: ContributionRow["status"] = "paid"
  ): ContributionRow {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO contributions (tanda_id, participant_id, round, amount, status) VALUES (?, ?, ?, ?, ?)"
    );
    const result = stmt.run(tandaId, participantId, round, amount, status);
    return this.findById(result.lastInsertRowid as number)!;
  },

  findById(id: number): ContributionRow | undefined {
    const db = getDb();
    return db
      .prepare("SELECT * FROM contributions WHERE id = ?")
      .get(id) as ContributionRow | undefined;
  },

  findByTandaAndRound(
    tandaId: number,
    round: number
  ): ContributionRow[] {
    const db = getDb();
    return db
      .prepare(
        "SELECT * FROM contributions WHERE tanda_id = ? AND round = ?"
      )
      .all(tandaId, round) as ContributionRow[];
  },

  findByParticipant(participantId: number): ContributionRow[] {
    const db = getDb();
    return db
      .prepare(
        "SELECT * FROM contributions WHERE participant_id = ? ORDER BY round ASC"
      )
      .all(participantId) as ContributionRow[];
  },

  findByParticipantAndRound(
    participantId: number,
    round: number
  ): ContributionRow | undefined {
    const db = getDb();
    return db
      .prepare(
        "SELECT * FROM contributions WHERE participant_id = ? AND round = ?"
      )
      .get(participantId, round) as ContributionRow | undefined;
  },

  countConsecutiveMissed(participantId: number, upToRound: number): number {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT round, status FROM contributions
         WHERE participant_id = ? AND round <= ?
         ORDER BY round DESC`
      )
      .all(participantId, upToRound) as ContributionRow[];

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

  updateStatus(id: number, status: ContributionRow["status"]): void {
    const db = getDb();
    db.prepare("UPDATE contributions SET status = ? WHERE id = ?").run(
      status,
      id
    );
  },

  findPendingByTandaAndRound(
    tandaId: number,
    round: number
  ): ContributionRow[] {
    const db = getDb();
    return db
      .prepare(
        "SELECT * FROM contributions WHERE tanda_id = ? AND round = ? AND status = 'pending'"
      )
      .all(tandaId, round) as ContributionRow[];
  },
};
