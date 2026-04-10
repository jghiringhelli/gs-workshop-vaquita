import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  name: string;
}

export class UserRepository {
  constructor(private db: Database.Database) {}

  findAll(): User[] {
    return this.db.prepare('SELECT * FROM users').all() as User[];
  }

  findById(id: string): User | undefined {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  }

  findByEmail(email: string): User | undefined {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  }

  create(data: { email: string; name: string }): User {
    const id = uuidv4();
    this.db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(id, data.email, data.name);
    return { id, ...data };
  }
}
