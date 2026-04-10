import db from '../db';
import { User } from '../types';

export function createUser(email: string, name: string): User {
  const stmt = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
  const result = stmt.run(email, name);
  return { id: result.lastInsertRowid as number, email, name };
}

export function findAllUsers(): User[] {
  return db.prepare('SELECT id, email, name FROM users').all() as User[];
}

export function findUserById(id: number): User | undefined {
  return db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(id) as User | undefined;
}

export function findUserByEmail(email: string): User | undefined {
  return db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email) as User | undefined;
}
