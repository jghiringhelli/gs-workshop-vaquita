import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { User } from '../types';
import { IUserRepository } from './user-repository.interface';

/**
 * SQLite implementation of UserRepository
 */
export class UserRepository implements IUserRepository {
  /**
   * @param db - Database instance
   */
  constructor(private db: Database.Database) {}

  create(email: string, name: string): User {
    const id = uuidv4();
    const now = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, email, name, now.toISOString());

    return {
      id,
      email,
      name,
      createdAt: now,
    };
  }

  getById(id: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at
      FROM users
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: new Date(row.created_at),
    };
  }

  getByEmail(email: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at
      FROM users
      WHERE email = ?
    `);

    const row = stmt.get(email) as any;
    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: new Date(row.created_at),
    };
  }

  list(): User[] {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: new Date(row.created_at),
    }));
  }
}
