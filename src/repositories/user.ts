import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { NotFoundError, ValidationError } from '../errors';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export class UserRepository {
  constructor(private db: Database.Database) {}

  create(email: string, name: string): User {
    const id = uuid();
    const now = new Date().toISOString();

    try {
      const result = this.db
        .prepare(
          `
          INSERT INTO users (id, email, name, created_at)
          VALUES (?, ?, ?, ?)
        `
        )
        .run(id, email, name, now);

      if (!result.changes) {
        throw new ValidationError('Failed to create user');
      }

      return { id, email, name, created_at: now };
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        throw new ValidationError(`Email '${email}' is already registered`, 'EMAIL_ALREADY_EXISTS');
      }
      throw error;
    }
  }

  getById(id: string): User {
    const row = this.db
      .prepare(
        `
        SELECT id, email, name, created_at
        FROM users
        WHERE id = ?
      `
      )
      .get(id) as any;

    if (!row) {
      throw new NotFoundError('User', id);
    }

    return this.normalizeUser(row);
  }

  getByEmail(email: string): User {
    const row = this.db
      .prepare(
        `
        SELECT id, email, name, created_at
        FROM users
        WHERE email = ?
      `
      )
      .get(email) as any;

    if (!row) {
      throw new NotFoundError('User with email', email);
    }

    return this.normalizeUser(row);
  }

  list(): User[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, email, name, created_at
        FROM users
        ORDER BY created_at DESC
      `
      )
      .all() as any[];

    return rows.map((row) => this.normalizeUser(row));
  }

  private normalizeUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      created_at: row.created_at,
    };
  }
}
