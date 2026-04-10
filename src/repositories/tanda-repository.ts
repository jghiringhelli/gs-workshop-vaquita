import type { Tanda, TandaStatus } from "../domain/models";
import { getDatabase } from "../db/database";

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

export class TandaRepository {
  create(input: {
    name: string;
    organizerId: number;
    contributionAmount: number;
  }): Tanda {
    const db = getDatabase();
    const stmt = db.prepare(
      `INSERT INTO tandas (name, organizer_id, contribution_amount, status, current_round, total_rounds)
       VALUES (?, ?, ?, 'forming', 1, 0)
       RETURNING id, name, organizer_id, contribution_amount, status, current_round, total_rounds`
    );

    const row = stmt.get(
      input.name,
      input.organizerId,
      input.contributionAmount
    ) as TandaRow;

    return toTanda(row);
  }

  findById(id: number): Tanda | null {
    const db = getDatabase();
    const stmt = db.prepare(
      "SELECT id, name, organizer_id, contribution_amount, status, current_round, total_rounds FROM tandas WHERE id = ?"
    );
    const row = stmt.get(id) as TandaRow | undefined;
    return row ? toTanda(row) : null;
  }

  listByUser(userId: number): Tanda[] {
    const db = getDatabase();
    const stmt = db.prepare(
      `SELECT t.id, t.name, t.organizer_id, t.contribution_amount, t.status, t.current_round, t.total_rounds
       FROM tandas t
       INNER JOIN participants p ON p.tanda_id = t.id
       WHERE p.user_id = ?
       ORDER BY t.id ASC`
    );
    const rows = stmt.all(userId) as TandaRow[];
    return rows.map(toTanda);
  }

  updateStatus(id: number, status: TandaStatus): void {
    const db = getDatabase();
    const stmt = db.prepare("UPDATE tandas SET status = ? WHERE id = ?");
    stmt.run(status, id);
  }

  updateRoundState(id: number, currentRound: number, totalRounds: number): void {
    const db = getDatabase();
    const stmt = db.prepare(
      "UPDATE tandas SET current_round = ?, total_rounds = ? WHERE id = ?"
    );
    stmt.run(currentRound, totalRounds, id);
  }
}
