import Database from 'better-sqlite3';

export interface Participant {
  id: number;
  userId: number;
  tandaId: number;
  role: 'organizer' | 'member';
  rotationPosition: number | null;
  consecutiveMissed: number;
  isDefaulter: number;
}

export function createParticipantRepository(db: Database.Database) {
  return {
    findById(id: number): Participant | undefined {
      return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Participant | undefined;
    },
    findByTanda(tandaId: number): Participant[] {
      return db
        .prepare('SELECT * FROM participants WHERE tandaId = ? ORDER BY rotationPosition ASC NULLS LAST, id ASC')
        .all(tandaId) as Participant[];
    },
    findByUserAndTanda(userId: number, tandaId: number): Participant | undefined {
      return db
        .prepare('SELECT * FROM participants WHERE userId = ? AND tandaId = ?')
        .get(userId, tandaId) as Participant | undefined;
    },
    countByTanda(tandaId: number): number {
      const result = db
        .prepare('SELECT COUNT(*) as count FROM participants WHERE tandaId = ?')
        .get(tandaId) as { count: number };
      return result.count;
    },
    create(data: { userId: number; tandaId: number; role: string }): Participant {
      return db
        .prepare(
          'INSERT INTO participants (userId, tandaId, role) VALUES (?, ?, ?) RETURNING *'
        )
        .get(data.userId, data.tandaId, data.role) as Participant;
    },
    assignRotationPositions(tandaId: number, positions: { id: number; position: number }[]): void {
      const stmt = db.prepare('UPDATE participants SET rotationPosition = ? WHERE id = ?');
      const updateMany = db.transaction((items: { id: number; position: number }[]) => {
        for (const item of items) {
          stmt.run(item.position, item.id);
        }
      });
      updateMany(positions);
    },
    updateDefaulterStatus(id: number, consecutiveMissed: number, isDefaulter: number): void {
      db.prepare(
        'UPDATE participants SET consecutiveMissed = ?, isDefaulter = ? WHERE id = ?'
      ).run(consecutiveMissed, isDefaulter, id);
    },
  };
}

export type ParticipantRepository = ReturnType<typeof createParticipantRepository>;
