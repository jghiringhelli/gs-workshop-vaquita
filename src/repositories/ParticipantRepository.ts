import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Participant } from '../models';

export class ParticipantRepository {
  constructor(private readonly db: Database.Database) {}

  create(data: Omit<Participant, 'id' | 'rotationPosition'>): Participant {
    const participant: Participant = { id: uuidv4(), ...data, rotationPosition: 0 };
    this.db.prepare(
      'INSERT INTO participants (id, userId, tandaId, role, rotationPosition) VALUES (?, ?, ?, ?, ?)'
    ).run(participant.id, participant.userId, participant.tandaId, participant.role, participant.rotationPosition);
    return participant;
  }

  findById(id: string): Participant | undefined {
    return this.db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Participant | undefined;
  }

  findByTandaId(tandaId: string): Participant[] {
    return this.db.prepare('SELECT * FROM participants WHERE tandaId = ? ORDER BY rotationPosition').all(tandaId) as Participant[];
  }

  findByUserAndTanda(userId: string, tandaId: string): Participant | undefined {
    return this.db.prepare('SELECT * FROM participants WHERE userId = ? AND tandaId = ?').get(userId, tandaId) as Participant | undefined;
  }

  countByTandaId(tandaId: string): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM participants WHERE tandaId = ?').get(tandaId) as { count: number };
    return result.count;
  }

  assignRotationPositions(tandaId: string, orderedIds: string[]): void {
    const stmt = this.db.prepare('UPDATE participants SET rotationPosition = ? WHERE id = ?');
    const update = this.db.transaction(() => {
      orderedIds.forEach((id, index) => stmt.run(index + 1, id));
    });
    update();
  }
}
