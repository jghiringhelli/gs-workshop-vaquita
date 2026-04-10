import { getDb } from '../db/database';

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export function createUser(email: string, name: string): User {
  const db = getDb();
  const stmt = db.prepare<[string, string], User>(
    'INSERT INTO users (email, name) VALUES (?, ?) RETURNING *'
  );
  return stmt.get(email, name) as User;
}

export function listUsers(): User[] {
  const db = getDb();
  return db.prepare<[], User>('SELECT * FROM users ORDER BY id').all();
}

export function getUserById(id: number): User | undefined {
  const db = getDb();
  return db.prepare<[number], User>('SELECT * FROM users WHERE id = ?').get(id);
}

export function getUserByEmail(email: string): User | undefined {
  const db = getDb();
  return db.prepare<[string], User>('SELECT * FROM users WHERE email = ?').get(email);
}
