import { v4 as uuidv4 } from "uuid";
import { db } from "../db/database";

export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: "forming" | "active" | "completed" | "cancelled";
  currentRound: number;
  totalRounds: number;
}

export const tandaRepository = {
  create(data: {
    name: string;
    organizerId: string;
    contributionAmount: number;
  }): Tanda {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO tandas (id, name, organizerId, contributionAmount, status, currentRound, totalRounds)
       VALUES (?, ?, ?, ?, 'forming', 0, 0)`,
    ).run(id, data.name, data.organizerId, data.contributionAmount);
    return {
      id,
      ...data,
      status: "forming",
      currentRound: 0,
      totalRounds: 0,
    };
  },

  findById(id: string): Tanda | undefined {
    return db.prepare("SELECT * FROM tandas WHERE id = ?").get(id) as
      | Tanda
      | undefined;
  },

  findByUserId(userId: string): Tanda[] {
    return db
      .prepare(
        `SELECT t.* FROM tandas t
         INNER JOIN participants p ON p.tandaId = t.id
         WHERE p.userId = ?`,
      )
      .all(userId) as Tanda[];
  },

  updateStatus(id: string, status: Tanda["status"]): void {
    db.prepare("UPDATE tandas SET status = ? WHERE id = ?").run(status, id);
  },

  updateRound(id: string, currentRound: number, totalRounds: number): void {
    db.prepare(
      "UPDATE tandas SET currentRound = ?, totalRounds = ? WHERE id = ?",
    ).run(currentRound, totalRounds, id);
  },

  advanceRound(id: string, nextRound: number): void {
    db.prepare("UPDATE tandas SET currentRound = ? WHERE id = ?").run(
      nextRound,
      id,
    );
  },
};
