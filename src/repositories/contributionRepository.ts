import Database from 'better-sqlite3';
import { Contribution, ContributionStatus } from '../models/types';
import { NotFoundError, ConflictError } from '../errors/customErrors';

export class ContributionRepository {
  constructor(private db: Database.Database) {}

  create(
    tandaId: number,
    participantId: number,
    round: number,
    amount: number,
    status: ContributionStatus = 'pending'
  ): Contribution {
    const stmt = this.db.prepare(`
      INSERT INTO contributions (tanda_id, participant_id, round, amount, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(tandaId, participantId, round, amount, status);
      return this.findById(result.lastInsertRowid as number)!;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new ConflictError(
          `Contribution for participant ${participantId} in round ${round} already exists`
        );
      }
      throw error;
    }
  }

  findById(id: number): Contribution | null {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        tanda_id as tandaId,
        participant_id as participantId,
        round,
        amount,
        status,
        paid_at as paidAt,
        created_at as createdAt
      FROM contributions
      WHERE id = ?
    `);

    const row = stmt.get(id) as Contribution | undefined;
    return row || null;
  }

  findByTandaAndRound(tandaId: number, round: number): Contribution[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        tanda_id as tandaId,
        participant_id as participantId,
        round,
        amount,
        status,
        paid_at as paidAt,
        created_at as createdAt
      FROM contributions
      WHERE tanda_id = ? AND round = ?
      ORDER BY id
    `);

    return stmt.all(tandaId, round) as Contribution[];
  }

  findByParticipant(participantId: number): Contribution[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        tanda_id as tandaId,
        participant_id as participantId,
        round,
        amount,
        status,
        paid_at as paidAt,
        created_at as createdAt
      FROM contributions
      WHERE participant_id = ?
      ORDER BY round
    `);

    return stmt.all(participantId) as Contribution[];
  }

  findByTandaAndParticipant(tandaId: number, participantId: number): Contribution[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        tanda_id as tandaId,
        participant_id as participantId,
        round,
        amount,
        status,
        paid_at as paidAt,
        created_at as createdAt
      FROM contributions
      WHERE tanda_id = ? AND participant_id = ?
      ORDER BY round
    `);

    return stmt.all(tandaId, participantId) as Contribution[];
  }

  updateStatus(id: number, status: ContributionStatus): void {
    const stmt = this.db.prepare(`
      UPDATE contributions
      SET status = ?
      WHERE id = ?
    `);

    const result = stmt.run(status, id);
    if (result.changes === 0) {
      throw new NotFoundError(`Contribution with id ${id} not found`);
    }
  }

  setPaidAt(id: number, timestamp: string): void {
    const stmt = this.db.prepare(`
      UPDATE contributions
      SET paid_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(timestamp, id);
    if (result.changes === 0) {
      throw new NotFoundError(`Contribution with id ${id} not found`);
    }
  }

  createBulkForRound(tandaId: number, participantIds: number[], round: number, amount: number): void {
    const stmt = this.db.prepare(`
      INSERT INTO contributions (tanda_id, participant_id, round, amount, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);

    const transaction = this.db.transaction(() => {
      participantIds.forEach((participantId) => {
        stmt.run(tandaId, participantId, round, amount);
      });
    });

    transaction();
  }

  getConsecutiveMisses(participantId: number, upToRound: number): number {
    const stmt = this.db.prepare(`
      SELECT round, status
      FROM contributions
      WHERE participant_id = ? AND round <= ?
      ORDER BY round DESC
    `);

    const contributions = stmt.all(participantId, upToRound) as Array<{
      round: number;
      status: ContributionStatus;
    }>;

    let consecutiveMisses = 0;
    for (const contrib of contributions) {
      if (contrib.status === 'missed') {
        consecutiveMisses++;
      } else {
        break;
      }
    }

    return consecutiveMisses;
  }
}
