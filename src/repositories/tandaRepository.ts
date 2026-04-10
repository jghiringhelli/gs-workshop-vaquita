import { db } from '../db/database';
import { Tanda } from '../types';

export function create(data: { name: string; organizerId: number; contributionAmount: number }): Tanda {
  const stmt = db.prepare('INSERT INTO tandas (name, organizerId, contributionAmount) VALUES (?, ?, ?)');
  const result = stmt.run(data.name, data.organizerId, data.contributionAmount);
  return findById(result.lastInsertRowid as number) as Tanda;
}

export function findById(id: number): Tanda | undefined {
  return db.prepare('SELECT * FROM tandas WHERE id = ?').get(id) as Tanda | undefined;
}

export function findByUserId(userId: number): Tanda[] {
  return db.prepare(`
    SELECT t.* FROM tandas t
    INNER JOIN participants p ON p.tandaId = t.id
    WHERE p.userId = ?
  `).all(userId) as Tanda[];
}

export function update(id: number, data: Partial<Omit<Tanda, 'id' | 'createdAt'>>): Tanda {
  const fields = Object.keys(data) as Array<keyof typeof data>;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values: unknown[] = fields.map(f => data[f]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (db.prepare(`UPDATE tandas SET ${setClause} WHERE id = ?`) as any).run(...values, id);
  return findById(id) as Tanda;
}

export function findAll(): Tanda[] {
  return db.prepare('SELECT * FROM tandas').all() as Tanda[];
}
