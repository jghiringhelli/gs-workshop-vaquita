import type Database from "better-sqlite3";
import type { ITandaRepository } from "./tanda.repository.js";
import type { Tanda, TandaStatus } from "./tanda.types.js";

interface TandaRow {
  id: string;
  name: string;
  organizer_id: string;
  contribution_amount: number;
  status: TandaStatus;
  current_round: number;
  total_rounds: number;
  created_at: string;
}

/** SQLite implementation of ITandaRepository. */
export class SqliteTandaRepository implements ITandaRepository {
  constructor(private readonly db: Database.Database) {}

  /** @inheritdoc */
  create(tanda: Tanda): Tanda {
    this.db
      .prepare(
        `INSERT INTO tandas (id, name, organizer_id, contribution_amount, status, current_round, total_rounds, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        tanda.id,
        tanda.name,
        tanda.organizerId,
        tanda.contributionAmount,
        tanda.status,
        tanda.currentRound,
        tanda.totalRounds,
        tanda.createdAt
      );
    return tanda;
  }

  /** @inheritdoc */
  findById(id: string): Tanda | null {
    const row = this.db
      .prepare("SELECT * FROM tandas WHERE id = ?")
      .get(id) as TandaRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  /** @inheritdoc */
  findByUserId(userId: string): Tanda[] {
    const rows = this.db
      .prepare(
        `SELECT t.* FROM tandas t
         JOIN participants p ON p.tanda_id = t.id
         WHERE p.user_id = ?
         ORDER BY t.created_at DESC`
      )
      .all(userId) as TandaRow[];
    return rows.map((r) => this.toEntity(r));
  }

  /** @inheritdoc */
  update(
    id: string,
    fields: Partial<Pick<Tanda, "status" | "currentRound" | "totalRounds">>
  ): Tanda {
    const setClauses: string[] = [];
    const values: (string | number)[] = [];

    if (fields.status !== undefined) {
      setClauses.push("status = ?");
      values.push(fields.status);
    }
    if (fields.currentRound !== undefined) {
      setClauses.push("current_round = ?");
      values.push(fields.currentRound);
    }
    if (fields.totalRounds !== undefined) {
      setClauses.push("total_rounds = ?");
      values.push(fields.totalRounds);
    }

    values.push(id);
    this.db
      .prepare(`UPDATE tandas SET ${setClauses.join(", ")} WHERE id = ?`)
      .run(...values);

    return this.findById(id)!;
  }

  private toEntity(row: TandaRow): Tanda {
    return {
      id: row.id,
      name: row.name,
      organizerId: row.organizer_id,
      contributionAmount: row.contribution_amount,
      status: row.status,
      currentRound: row.current_round,
      totalRounds: row.total_rounds,
      createdAt: row.created_at,
    };
  }
}
