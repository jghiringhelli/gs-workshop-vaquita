import { db } from '../db/database';
import { Participant } from '../types';

export function create(data: { userId: number; tandaId: number; role: string }): Participant {
  const stmt = db.prepare('INSERT INTO participants (userId, tandaId, role) VALUES (?, ?, ?)');
  const result = stmt.run(data.userId, data.tandaId, data.role);
  return db.prepare('SELECT * FROM participants WHERE id = ?').get(result.lastInsertRowid as number) as Participant;
}

export function findByTandaId(tandaId: number): Participant[] {
  return db.prepare('SELECT * FROM participants WHERE tandaId = ?').all(tandaId) as Participant[];
}

export function findByUserAndTanda(userId: number, tandaId: number): Participant | undefined {
  return db.prepare('SELECT * FROM participants WHERE userId = ? AND tandaId = ?').get(userId, tandaId) as Participant | undefined;
}

export function countByTanda(tandaId: number): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM participants WHERE tandaId = ?').get(tandaId) as { count: number };
  return row.count;
}

export function updateRotationPositions(tandaId: number, positions: { id: number; rotationPosition: number }[]): void {
  const stmt = db.prepare('UPDATE participants SET rotationPosition = ? WHERE id = ?');
  const updateAll = db.transaction((pos: { id: number; rotationPosition: number }[]) => {
    for (const p of pos) {
      stmt.run(p.rotationPosition, p.id);
    }
  });
  updateAll(positions);
}

export function updateIsDefaulter(id: number, isDefaulter: boolean): Participant {
  db.prepare('UPDATE participants SET isDefaulter = ? WHERE id = ?').run(isDefaulter ? 1 : 0, id);
  return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Participant;
}
