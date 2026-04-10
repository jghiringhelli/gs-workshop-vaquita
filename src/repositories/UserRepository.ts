import Database from 'better-sqlite3';
import { User } from '../models';
import { IUserRepository } from './interfaces';

type UserRow = { id: string; email: string; name: string; createdAt: string };

export class UserRepository implements IUserRepository {
  constructor(private readonly db: Database.Database) {}

  create(data: Omit<User, 'createdAt'>): User {
    const createdAt = new Date().toISOString();
    this.db
      .prepare('INSERT INTO users (id, email, name, createdAt) VALUES (?, ?, ?, ?)')
      .run(data.id, data.email, data.name, createdAt);
    return { ...data, createdAt };
  }

  findById(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ?? null;
  }

  findAll(): User[] {
    return this.db.prepare('SELECT * FROM users ORDER BY createdAt ASC').all() as UserRow[];
  }

  findByEmail(email: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    return row ?? null;
  }
}
