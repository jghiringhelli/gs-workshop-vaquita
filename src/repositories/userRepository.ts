import { db } from '../db/database';
import { User } from '../types';

export function create(data: { email: string; name: string }): User {
  const stmt = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
  const result = stmt.run(data.email, data.name);
  return findById(result.lastInsertRowid as number) as User;
}

export function findById(id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function findByEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
}

export function findAll(): User[] {
  return db.prepare('SELECT * FROM users').all() as User[];
}
