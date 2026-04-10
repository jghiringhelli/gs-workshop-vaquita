/**
 * User Repository
 * Handles all user persistence operations
 */

import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { User, UserRepository as IUserRepository } from '../types/index.js';

export class UserRepository implements IUserRepository {
  constructor(private db: Database.Database) {}

  create(userData: Omit<User, 'id' | 'createdAt'>): User {
    const id = uuidv4();
    const createdAt = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, userData.email, userData.name, createdAt.toISOString());

    return {
      id,
      email: userData.email,
      name: userData.name,
      createdAt,
    };
  }

  findById(id: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.mapRowToUser(row) : null;
  }

  findByEmail(email: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as any;

    return row ? this.mapRowToUser(row) : null;
  }

  list(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map((row) => this.mapRowToUser(row));
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: new Date(row.created_at),
    };
  }
}
