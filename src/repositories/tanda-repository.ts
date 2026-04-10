import { getDb } from "../db/database";
import type { Tanda, TandaStatus } from "../domain/models";

interface TandaRow {
  id: number;
  name: string;
  organizer_id: number;
  contribution_amount: number;
  status: TandaStatus;
  current_round: number;
  total_rounds: number;
}

function toTanda(row: TandaRow): Tanda {
  return {
    id: row.id,
    name: row.name,
    organizerId: row.organizer_id,
    contributionAmount: row.contribution_amount,
    status: row.status,
    currentRound: row.current_round,
    totalRounds: row.total_rounds,
  };
}

/**
 * Repository for Tanda persistence.
 */
export class TandaRepository {
  /**
   * Creates a new tanda in FORMING status and returns it.
   * @param name - tanda name
   * @param organizerId - user id of the organizer
   * @param contributionAmount - fixed amount per round
   * @returns created Tanda
   */
  create(name: string, organizerId: number, contributionAmount: number): Tanda {
    const stmt = getDb().prepare(`
      INSERT INTO tandas (name, organizer_id, contribution_amount)
      VALUES (?, ?, ?) RETURNING *
    `);
    return toTanda(stmt.get(name, organizerId, contributionAmount) as TandaRow);
  }

  /**
   * Finds a tanda by primary key.
   * @param id - tanda id
   * @returns Tanda or null
   */
  findById(id: number): Tanda | null {
    const row = getDb()
      .prepare("SELECT * FROM tandas WHERE id = ?")
      .get(id) as TandaRow | undefined;
    return row ? toTanda(row) : null;
  }

  /**
   * Returns all tandas where the given user is organizer or participant.
   * @param userId - user id
   * @returns Tanda[]
   */
  findByUserId(userId: number): Tanda[] {
    const rows = getDb()
      .prepare(
        `SELECT DISTINCT t.* FROM tandas t
         LEFT JOIN participants p ON p.tanda_id = t.id
         WHERE t.organizer_id = ? OR p.user_id = ?
         ORDER BY t.id`,
      )
      .all(userId, userId) as TandaRow[];
    return rows.map(toTanda);
  }

  /**
   * Updates the status and round numbers of a tanda.
   * @param id - tanda id
   * @param fields - fields to update
   * @returns updated Tanda or null
   */
  update(
    id: number,
    fields: Partial<Pick<Tanda, "status" | "currentRound" | "totalRounds">>,
  ): Tanda | null {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.status !== undefined) { sets.push("status = ?"); values.push(fields.status); }
    if (fields.currentRound !== undefined) { sets.push("current_round = ?"); values.push(fields.currentRound); }
    if (fields.totalRounds !== undefined) { sets.push("total_rounds = ?"); values.push(fields.totalRounds); }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    getDb().prepare(`UPDATE tandas SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    return this.findById(id);
  }
}
