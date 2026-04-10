import Database from 'better-sqlite3';
import { Participant, ParticipantRole } from '../models';
import { IParticipantRepository } from './interfaces';

type ParticipantRow = {
  id: string;
  userId: string;
  tandaId: string;
  role: string;
  rotationPosition: number | null;
  isDefaulter: number;
  consecutiveMissed: number;
  createdAt: string;
};

function rowToParticipant(row: ParticipantRow): Participant {
  return {
    ...row,
    role: row.role as ParticipantRole,
    isDefaulter: row.isDefaulter === 1,
  };
}

export class ParticipantRepository implements IParticipantRepository {
  constructor(private readonly db: Database.Database) {}

  create(data: Omit<Participant, 'createdAt'>): Participant {
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO participants (id, userId, tandaId, role, rotationPosition, isDefaulter, consecutiveMissed, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        data.id,
        data.userId,
        data.tandaId,
        data.role,
        data.rotationPosition,
        data.isDefaulter ? 1 : 0,
        data.consecutiveMissed,
        createdAt,
      );
    return { ...data, createdAt };
  }

  findById(id: string): Participant | null {
    const row = this.db
      .prepare('SELECT * FROM participants WHERE id = ?')
      .get(id) as ParticipantRow | undefined;
    return row ? rowToParticipant(row) : null;
  }

  findByTandaId(tandaId: string): Participant[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM participants WHERE tandaId = ? ORDER BY rotationPosition ASC, createdAt ASC',
      )
      .all(tandaId) as ParticipantRow[];
    return rows.map(rowToParticipant);
  }

  findByUserAndTanda(userId: string, tandaId: string): Participant | null {
    const row = this.db
      .prepare('SELECT * FROM participants WHERE userId = ? AND tandaId = ?')
      .get(userId, tandaId) as ParticipantRow | undefined;
    return row ? rowToParticipant(row) : null;
  }

  update(
    id: string,
    data: Partial<Pick<Participant, 'rotationPosition' | 'role' | 'isDefaulter' | 'consecutiveMissed'>>,
  ): Participant {
    const mapped: Record<string, unknown> = { ...data };
    if ('isDefaulter' in mapped) {
      mapped['isDefaulter'] = mapped['isDefaulter'] ? 1 : 0;
    }
    const fields = Object.keys(mapped)
      .map((k) => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(mapped), id];
    this.db.prepare(`UPDATE participants SET ${fields} WHERE id = ?`).run(...values);
    return this.findById(id)!;
  }

  countByTandaId(tandaId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM participants WHERE tandaId = ?')
      .get(tandaId) as { count: number };
    return row.count;
  }

  updateRotationPositions(updates: Array<{ id: string; rotationPosition: number }>): void {
    const stmt = this.db.prepare('UPDATE participants SET rotationPosition = ? WHERE id = ?');
    const updateAll = this.db.transaction((items: Array<{ id: string; rotationPosition: number }>) => {
      for (const item of items) {
        stmt.run(item.rotationPosition, item.id);
      }
    });
    updateAll(updates);
  }
}
