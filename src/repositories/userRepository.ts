import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';

export interface UserRow {
  id: string;
  email: string;
  name: string;
}

export function createUser(
  data: { email: string; name: string },
  db: Database.Database = getDb(),
): UserRow {
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(id, data.email, data.name);
  return { id, email: data.email, name: data.name };
}

export function findAllUsers(db: Database.Database = getDb()): UserRow[] {
  return db.prepare('SELECT * FROM users').all() as UserRow[];
}

export function findUserById(id: string, db: Database.Database = getDb()): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function findUserByEmail(email: string, db: Database.Database = getDb()): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}
