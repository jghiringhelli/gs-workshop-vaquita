import { db } from "../db/database";
import { CreateTandaInput, Tanda, TandaStatus } from "../domain/models";

function mapTanda(row: Record<string, unknown>): Tanda {
  return {
    id: Number(row.id),
    name: String(row.name),
    organizerId: Number(row.organizer_id),
    contributionAmount: Number(row.contribution_amount),
    status: row.status as TandaStatus,
    currentRound: Number(row.current_round),
    totalRounds: Number(row.total_rounds),
  };
}

export const tandaRepository = {
  create(input: CreateTandaInput): Tanda {
    const now = new Date().toISOString();
    const insert = db.prepare(
      `INSERT INTO tandas (
         name, organizer_id, contribution_amount, status,
         current_round, total_rounds, created_at, updated_at
       ) VALUES (?, ?, ?, 'forming', 0, 0, ?, ?)`
    );
    const result = insert.run(input.name, input.organizerId, input.contributionAmount, now, now);
    return this.findById(Number(result.lastInsertRowid)) as Tanda;
  },

  listByUser(userId: number): Tanda[] {
    const rows = db
      .prepare(
        `SELECT t.*
         FROM tandas t
         INNER JOIN participants p ON p.tanda_id = t.id
         WHERE p.user_id = ?
         ORDER BY t.id DESC`
      )
      .all(userId) as Record<string, unknown>[];
    return rows.map(mapTanda);
  },

  findById(id: number): Tanda | null {
    const row = db.prepare(`SELECT * FROM tandas WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    return row ? mapTanda(row) : null;
  },

  setStatus(id: number, status: TandaStatus): void {
    const now = new Date().toISOString();
    db.prepare(`UPDATE tandas SET status = ?, updated_at = ? WHERE id = ?`).run(status, now, id);
  },

  activate(id: number, totalRounds: number): void {
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE tandas
       SET status = 'active',
           current_round = 1,
           total_rounds = ?,
           started_at = ?,
           round_started_at = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(totalRounds, now, now, now, id);
  },

  advanceRound(id: number, nextRound: number, status: TandaStatus): void {
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE tandas
       SET current_round = ?,
           status = ?,
           round_started_at = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(nextRound, status, now, now, id);
  },

  getRoundStartedAt(id: number): Date | null {
    const row = db.prepare(`SELECT round_started_at FROM tandas WHERE id = ?`).get(id) as
      | { round_started_at: string | null }
      | undefined;
    if (!row?.round_started_at) {
      return null;
    }
    return new Date(row.round_started_at);
  },
};
