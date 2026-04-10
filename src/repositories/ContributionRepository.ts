import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Contribution, ContributionStatus } from '../models';

export class ContributionRepository {
  constructor(private readonly db: Database.Database) {}

  create(data: Omit<Contribution, 'id'>): Contribution {
    const contribution: Contribution = { id: uuidv4(), ...data };
    this.db.prepare(
      'INSERT INTO contributions (id, tandaId, participantId, round, amount, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(contribution.id, contribution.tandaId, contribution.participantId, contribution.round, contribution.amount, contribution.status);
    return contribution;
  }

  findByParticipantAndRound(participantId: string, round: number): Contribution | undefined {
    return this.db.prepare('SELECT * FROM contributions WHERE participantId = ? AND round = ?').get(participantId, round) as Contribution | undefined;
  }

  findByTandaAndRound(tandaId: string, round: number): Contribution[] {
    return this.db.prepare('SELECT * FROM contributions WHERE tandaId = ? AND round = ?').all(tandaId, round) as Contribution[];
  }

  findByParticipant(participantId: string): Contribution[] {
    return this.db.prepare('SELECT * FROM contributions WHERE participantId = ? ORDER BY round').all(participantId) as Contribution[];
  }

  updateStatus(id: string, status: ContributionStatus): void {
    this.db.prepare('UPDATE contributions SET status = ? WHERE id = ?').run(status, id);
  }

  findLastTwoByParticipant(participantId: string): Contribution[] {
    return this.db.prepare('SELECT * FROM contributions WHERE participantId = ? ORDER BY round DESC LIMIT 2').all(participantId) as Contribution[];
  }
}
