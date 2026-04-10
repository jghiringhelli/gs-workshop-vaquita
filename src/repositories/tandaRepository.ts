import Database from 'better-sqlite3';

export interface Tanda {
  id: number;
  name: string;
  organizerId: number;
  contributionAmount: number;
  status: 'forming' | 'active' | 'completed' | 'cancelled';
  currentRound: number;
  totalRounds: number;
  createdAt: string;
}

export function createTandaRepository(db: Database.Database) {
  return {
    findById(id: number): Tanda | undefined {
      return db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as Tanda | undefined;
    },
    findAll(userId?: number): Tanda[] {
      if (userId !== undefined) {
        return db.prepare(
          `SELECT t.* FROM tandas t
           JOIN participants p ON p.tandaId = t.id
           WHERE p.userId = ?`
        ).all(userId) as Tanda[];
      }
      return db.prepare('SELECT * FROM tandas').all() as Tanda[];
    },
    create(data: { name: string; organizerId: number; contributionAmount: number }): Tanda {
      return db
        .prepare(
          'INSERT INTO tandas (name, organizerId, contributionAmount) VALUES (?, ?, ?) RETURNING *'
        )
        .get(data.name, data.organizerId, data.contributionAmount) as Tanda;
    },
    updateStatus(id: number, status: string): Tanda | undefined {
      return db
        .prepare('UPDATE tandas SET status = ? WHERE id = ? RETURNING *')
        .get(status, id) as Tanda | undefined;
    },
    updateRound(id: number, currentRound: number, totalRounds?: number): Tanda | undefined {
      if (totalRounds !== undefined) {
        return db
          .prepare('UPDATE tandas SET currentRound = ?, totalRounds = ? WHERE id = ? RETURNING *')
          .get(currentRound, totalRounds, id) as Tanda | undefined;
      }
      return db
        .prepare('UPDATE tandas SET currentRound = ? WHERE id = ? RETURNING *')
        .get(currentRound, id) as Tanda | undefined;
    },
    updateStatusAndRound(id: number, status: string, currentRound: number): Tanda | undefined {
      return db
        .prepare('UPDATE tandas SET status = ?, currentRound = ? WHERE id = ? RETURNING *')
        .get(status, currentRound, id) as Tanda | undefined;
    },
  };
}

export type TandaRepository = ReturnType<typeof createTandaRepository>;
