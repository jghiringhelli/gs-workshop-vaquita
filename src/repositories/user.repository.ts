import { getDb } from '../db/database';

export interface UserRow {
  id: number;
  email: string;
  name: string;
}

export function createUser(email: string, name: string): UserRow {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
  const result = stmt.run(email, name);
  return { id: Number(result.lastInsertRowid), email, name };
}

export function findUserById(id: number): UserRow | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT id, email, name FROM users WHERE id = ?');
  return stmt.get(id) as UserRow | undefined;
}

export function findUserByEmail(email: string): UserRow | undefined {
  const db = getDb();
  const stmt = db.prepare('SELECT id, email, name FROM users WHERE email = ?');
  return stmt.get(email) as UserRow | undefined;
}

export function findAllUsers(): UserRow[] {
  const db = getDb();
  const stmt = db.prepare('SELECT id, email, name FROM users');
  return stmt.all() as UserRow[];
}
