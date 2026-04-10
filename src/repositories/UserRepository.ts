import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import type { User } from '../domain/types.js';
import type { IUserRepository } from '../domain/interfaces.js';

interface UserRow {
  id: string;
  email: string;
  name: string;
}

function mapRow(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name };
}

/** SQLite-backed implementation of IUserRepository. */
export class UserRepository implements IUserRepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Insert a new user row and return the created User.
   * @param data - email and name for the new user
   * @returns The created User record
   */
  create(data: { email: string; name: string }): User {
    const id = uuid();
    this.db
      .prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)')
      .run(id, data.email, data.name);
    return { id, email: data.email, name: data.name };
  }

  /**
   * Look up a user by primary key.
   * @param id - UUID of the user
   * @returns User if found, undefined otherwise
   */
  findById(id: string): User | undefined {
    const row = this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as UserRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  /**
   * Return all users.
   * @returns Array of all User records
   */
  findAll(): User[] {
    const rows = this.db.prepare('SELECT * FROM users').all() as UserRow[];
    return rows.map(mapRow);
  }
}
