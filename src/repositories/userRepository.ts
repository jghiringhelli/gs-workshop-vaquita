import Database from 'better-sqlite3';
import { User } from '../models/types';
import { ConflictError, NotFoundError } from '../errors/customErrors';

export class UserRepository {
  constructor(private db: Database.Database) {}

  create(email: string, name: string): User {
    const stmt = this.db.prepare(`
      INSERT INTO users (email, name)
      VALUES (?, ?)
    `);

    try {
      const result = stmt.run(email, name);
      return this.findById(result.lastInsertRowid as number)!;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new ConflictError(`User with email ${email} already exists`);
      }
      throw error;
    }
  }

  findById(id: number): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at as createdAt
      FROM users
      WHERE id = ?
    `);

    const row = stmt.get(id) as User | undefined;
    return row || null;
  }

  findAll(): User[] {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at as createdAt
      FROM users
      ORDER BY id
    `);

    return stmt.all() as User[];
  }

  findByEmail(email: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at as createdAt
      FROM users
      WHERE email = ?
    `);

    const row = stmt.get(email) as User | undefined;
    return row || null;
  }
}
