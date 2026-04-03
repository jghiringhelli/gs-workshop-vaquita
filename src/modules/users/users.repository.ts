import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
}

/**
 * Repository: all SQLite access for the users table.
 */
export const createUsersRepository = (db: Database.Database) => ({
  /** Insert a new user row and return it. */
  insert(input: CreateUserInput): UserRow {
    const row: UserRow = {
      id: uuidv4(),
      email: input.email,
      name: input.name,
      created_at: new Date().toISOString(),
    };
    db.prepare(
      'INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)',
    ).run(row.id, row.email, row.name, row.created_at);
    return row;
  },

  /** Return all users ordered by creation date. */
  findAll(): UserRow[] {
    return db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as UserRow[];
  },

  /** Return a single user or undefined if not found. */
  findById(id: string): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  },

  /** Return a single user by email or undefined. */
  findByEmail(email: string): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  },
});

export type UsersRepository = ReturnType<typeof createUsersRepository>;
