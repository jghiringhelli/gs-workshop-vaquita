import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '../models';

export class UserRepository {
  constructor(private readonly db: Database.Database) {}

  create(data: Omit<User, 'id'>): User {
    const user: User = { id: uuidv4(), ...data };
    this.db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(user.id, user.email, user.name);
    return user;
  }

  findById(id: string): User | undefined {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  }

  findByEmail(email: string): User | undefined {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  }

  findAll(): User[] {
    return this.db.prepare('SELECT * FROM users').all() as User[];
  }
}
