import { getDb } from '../db';

export interface UserRow {
  id: number;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

/** Fields safe to return in API responses — never includes passwordHash. */
export type SafeUser = Omit<UserRow, 'passwordHash'>;

export function findByEmail(email: string): UserRow | undefined {
  return getDb()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email) as UserRow | undefined;
}

export function findById(id: number): SafeUser | undefined {
  return getDb()
    .prepare('SELECT id, email, username, createdAt FROM users WHERE id = ?')
    .get(id) as SafeUser | undefined;
}

export function create(
  email: string,
  username: string,
  passwordHash: string,
): SafeUser {
  const result = getDb()
    .prepare(
      'INSERT INTO users (email, username, passwordHash) VALUES (?, ?, ?)',
    )
    .run(email, username, passwordHash);

  return findById(result.lastInsertRowid as number) as SafeUser;
}
