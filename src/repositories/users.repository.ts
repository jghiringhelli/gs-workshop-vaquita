import { getDb } from '../db';
import type { User } from '../types';

export function createUser(email: string, name: string): User {
  const db = getDb();
  return db
    .prepare<[string, string], User>('INSERT INTO users (email, name) VALUES (?, ?) RETURNING *')
    .get(email, name) as User;
}

export function findUserById(id: number): User | undefined {
  return getDb()
    .prepare<[number], User>('SELECT * FROM users WHERE id = ?')
    .get(id);
}

export function findUserByEmail(email: string): User | undefined {
  return getDb()
    .prepare<[string], User>('SELECT * FROM users WHERE email = ?')
    .get(email);
}

export function listUsers(): User[] {
  return getDb()
    .prepare<[], User>('SELECT * FROM users ORDER BY id')
    .all();
}
