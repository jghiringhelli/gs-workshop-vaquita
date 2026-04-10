import Database from 'better-sqlite3';
import { User } from '../models/user';

export class UserRepository {
  constructor(private db: Database.Database) {}

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
  }

  create(user: User): User {
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(user.id, user.email, user.name, user.createdAt.toISOString());
    return user;
  }

  findById(id: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at FROM users WHERE id = ?
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

  findByEmail(email: string): User | null {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at FROM users WHERE email = ?
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

  findAll(): User[] {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at FROM users
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: new Date(row.created_at),
    }));
  }
}
