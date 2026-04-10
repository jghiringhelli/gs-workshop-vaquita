import { getDb } from "../db/database";
import { Tanda, TandaStatus } from "../types";

interface TandaRow {
  id: number;
  name: string;
  organizer_id: number;
  contribution_amount: number;
  status: string;
  current_round: number;
  total_rounds: number;
}

function rowToTanda(row: TandaRow): Tanda {
  return {
    id: row.id,
    name: row.name,
    organizerId: row.organizer_id,
    contributionAmount: row.contribution_amount,
    status: row.status as TandaStatus,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
  };
}

export const tandaRepository = {
  create(name: string, organizerId: number, contributionAmount: number): Tanda {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO tandas (name, organizer_id, contribution_amount, status, current_round, total_rounds) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const result = stmt.run(
      name,
      organizerId,
      contributionAmount,
      "forming",
      0,
      0,
    );
    return {
      id: Number(result.lastInsertRowid),
      name,
      organizerId,
      contributionAmount,
      status: "forming",
      currentRound: 0,
      totalRounds: 0,
    };
  },

  findById(id: number): Tanda | undefined {
    const db = getDb();
    const stmt = db.prepare("SELECT * FROM tandas WHERE id = ?");
    const row = stmt.get(id) as TandaRow | undefined;
    return row ? rowToTanda(row) : undefined;
  },

  findByUserId(userId: number): Tanda[] {
    const db = getDb();
    const stmt = db.prepare(
      `SELECT t.* FROM tandas t
       INNER JOIN participants p ON p.tanda_id = t.id
       WHERE p.user_id = ?`,
    );
    return (stmt.all(userId) as TandaRow[]).map(rowToTanda);
  },

  updateStatus(id: number, status: TandaStatus): void {
    const db = getDb();
    db.prepare("UPDATE tandas SET status = ? WHERE id = ?").run(status, id);
  },

  updateRound(id: number, currentRound: number): void {
    const db = getDb();
    db.prepare("UPDATE tandas SET current_round = ? WHERE id = ?").run(
      currentRound,
      id,
    );
  },

  setTotalRounds(id: number, totalRounds: number): void {
    const db = getDb();
    db.prepare("UPDATE tandas SET total_rounds = ? WHERE id = ?").run(
      totalRounds,
      id,
    );
  },

  setCurrentRound(id: number, currentRound: number): void {
    const db = getDb();
    db.prepare("UPDATE tandas SET current_round = ? WHERE id = ?").run(
      currentRound,
      id,
    );
  },
};
