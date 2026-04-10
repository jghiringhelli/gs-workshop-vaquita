import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db/database';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export function createUser(email: string, name: string): User {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO users (id, email, name, createdAt) VALUES (?, ?, ?, ?)').run(id, email, name, now);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
}

export function findUserById(id: string): User | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function findUserByEmail(email: string): User | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
}

export function listUsers(): User[] {
  const db = getDb();
  return db.prepare('SELECT * FROM users ORDER BY createdAt DESC').all() as User[];
}
