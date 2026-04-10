import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { IContributionRepository } from "./contribution.repository.js";
import type { Contribution, ContributionStatus } from "./contribution.types.js";

interface ContributionRow {
  id: string;
  tanda_id: string;
  participant_id: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  created_at: string;
}

/** SQLite implementation of IContributionRepository. */
export class SqliteContributionRepository implements IContributionRepository {
  constructor(private readonly db: Database.Database) {}

  /** @inheritdoc */
  create(contribution: Contribution): Contribution {
    this.db
      .prepare(
        `INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        contribution.id,
        contribution.tandaId,
        contribution.participantId,
        contribution.round,
        contribution.amount,
        contribution.status,
        contribution.createdAt
      );
    return contribution;
  }

  /** @inheritdoc */
  findByTandaAndRound(tandaId: string, round: number): Contribution[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM contributions WHERE tanda_id = ? AND round = ? ORDER BY created_at ASC`
      )
      .all(tandaId, round) as ContributionRow[];
    return rows.map((r) => this.toEntity(r));
  }

  /** @inheritdoc */
  findByParticipantId(participantId: string): Contribution[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM contributions WHERE participant_id = ? ORDER BY round ASC`
      )
      .all(participantId) as ContributionRow[];
    return rows.map((r) => this.toEntity(r));
  }

  /** @inheritdoc */
  findByParticipantAndRound(participantId: string, round: number): Contribution | null {
    const row = this.db
      .prepare(
        `SELECT * FROM contributions WHERE participant_id = ? AND round = ?`
      )
      .get(participantId, round) as ContributionRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  /** @inheritdoc */
  createMissedForRound(tandaId: string, round: number, participantIds: string[]): void {
    const existing = this.findByTandaAndRound(tandaId, round);
    const paidIds = new Set(existing.map((c) => c.participantId));
    const now = new Date().toISOString();

    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO contributions (id, tanda_id, participant_id, round, amount, status, created_at)
       VALUES (?, ?, ?, ?, 0, 'missed', ?)`
    );
    const insertAll = this.db.transaction(() => {
      for (const pid of participantIds) {
        if (!paidIds.has(pid)) {
          stmt.run(uuidv4(), tandaId, pid, round, now);
        }
      }
    });
    insertAll();
  }

  private toEntity(row: ContributionRow): Contribution {
    return {
      id: row.id,
      tandaId: row.tanda_id,
      participantId: row.participant_id,
      round: row.round,
      amount: row.amount,
      status: row.status,
      createdAt: row.created_at,
    };
  }
}
