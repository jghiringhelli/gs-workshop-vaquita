import { getDb } from "../db/database.js";

export interface TandaRow {
  id: number;
  name: string;
  organizer_id: number;
  contribution_amount: number;
  status: "forming" | "active" | "completed" | "cancelled";
  current_round: number;
  total_rounds: number;
  created_at: string;
}

export const tandaRepository = {
  create(
    name: string,
    organizerId: number,
    contributionAmount: number
  ): TandaRow {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO tandas (name, organizer_id, contribution_amount) VALUES (?, ?, ?)"
    );
    const result = stmt.run(name, organizerId, contributionAmount);
    return this.findById(result.lastInsertRowid as number)!;
  },

  findAll(): TandaRow[] {
    const db = getDb();
    return db.prepare("SELECT * FROM tandas").all() as TandaRow[];
  },

  findByUserId(userId: number): TandaRow[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT t.* FROM tandas t
         INNER JOIN participants p ON p.tanda_id = t.id
         WHERE p.user_id = ?`
      )
      .all(userId) as TandaRow[];
  },

  findById(id: number): TandaRow | undefined {
    const db = getDb();
    return db.prepare("SELECT * FROM tandas WHERE id = ?").get(id) as
      | TandaRow
      | undefined;
  },

  updateStatus(id: number, status: TandaRow["status"]): void {
    const db = getDb();
    db.prepare("UPDATE tandas SET status = ? WHERE id = ?").run(status, id);
  },

  updateRound(id: number, currentRound: number): void {
    const db = getDb();
    db.prepare("UPDATE tandas SET current_round = ? WHERE id = ?").run(
      currentRound,
      id
    );
  },

  updateTotalRounds(id: number, totalRounds: number): void {
    const db = getDb();
    db.prepare("UPDATE tandas SET total_rounds = ? WHERE id = ?").run(
      totalRounds,
      id
    );
  },
};
