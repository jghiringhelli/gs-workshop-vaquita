import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Contribution } from '../domain/Tanda';
import { IContributionRepository } from '../ports/IContributionRepository';

/** SQLite adapter for the contribution repository port. */
export class SqliteContributionRepository implements IContributionRepository {
  constructor(private readonly db: Database.Database) {}

  create(data: Omit<Contribution, 'id'>): Contribution {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO contributions (id, tanda_id, participant_id, round, amount, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.tandaId, data.participantId, data.round, data.amount, data.status);
    return { id, ...data };
  }

  findByParticipantAndRound(participantId: string, round: number): Contribution | undefined {
    return this.db.prepare(`
      SELECT id, tanda_id as tandaId, participant_id as participantId, round, amount, status
      FROM contributions WHERE participant_id = ? AND round = ?
    `).get(participantId, round) as Contribution | undefined;
  }

  findByTandaAndRound(tandaId: string, round: number): Contribution[] {
    return this.db.prepare(`
      SELECT id, tanda_id as tandaId, participant_id as participantId, round, amount, status
      FROM contributions WHERE tanda_id = ? AND round = ?
      ORDER BY rowid ASC
    `).all(tandaId, round) as Contribution[];
  }

  findByParticipant(participantId: string): Contribution[] {
    return this.db.prepare(`
      SELECT id, tanda_id as tandaId, participant_id as participantId, round, amount, status
      FROM contributions WHERE participant_id = ?
      ORDER BY round ASC
    `).all(participantId) as Contribution[];
  }
}
