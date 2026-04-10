import Database from 'better-sqlite3';
import { getDb } from '../db/database';

export interface UserRow {
  id: number;
  email: string;
  name: string;
}

export function createUser(
  data: { email: string; name: string },
  db: Database.Database = getDb(),
): UserRow {
  const result = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)').run(data.email, data.name);
  return { id: Number(result.lastInsertRowid), email: data.email, name: data.name };
}

export function findAllUsers(db: Database.Database = getDb()): UserRow[] {
  return db.prepare('SELECT * FROM users').all() as UserRow[];
}

export function findUserById(id: number, db: Database.Database = getDb()): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function findUserByEmail(email: string, db: Database.Database = getDb()): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}
