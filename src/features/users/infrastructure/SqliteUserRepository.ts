import type Database from "better-sqlite3";

import type { CreateUserInput, User } from "../domain/User";
import type { UserRepository } from "../domain/UserRepository";

interface UserRow {
  readonly id: number;
  readonly email: string;
  readonly name: string;
  readonly created_at: string;
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  };
}

/**
 * Persist and query users from SQLite.
 */
export class SqliteUserRepository implements UserRepository {
  public constructor(private readonly database: Database.Database) {}

  /**
   * Create a new user row in SQLite.
   *
   * @param input The user payload to persist.
   * @returns The created user.
   */
  public create(input: CreateUserInput): User {
    const createdAt = new Date().toISOString();
    const result = this.database
      .prepare(
        `
          INSERT INTO users (email, name, created_at)
          VALUES (@email, @name, @createdAt)
        `,
      )
      .run({
        email: input.email,
        name: input.name,
        createdAt,
      });

    return this.getById(Number(result.lastInsertRowid)) as User;
  }

  /**
   * Return all users ordered by identifier.
   *
   * @returns The persisted users.
   */
  public list(): readonly User[] {
    const rows = this.database
      .prepare<[], UserRow>(
        `
          SELECT id, email, name, created_at
          FROM users
          ORDER BY id ASC
        `,
      )
      .all();

    return rows.map(mapUserRow);
  }

  /**
   * Return a user by identifier.
   *
   * @param userId The user identifier.
   * @returns The matching user when found, otherwise null.
   */
  public getById(userId: number): User | null {
    const row = this.database
      .prepare<[number], UserRow>(
        `
          SELECT id, email, name, created_at
          FROM users
          WHERE id = ?
        `,
      )
      .get(userId);

    return row ? mapUserRow(row) : null;
  }

  /**
   * Return a user by email.
   *
   * @param email The user email.
   * @returns The matching user when found, otherwise null.
   */
  public getByEmail(email: string): User | null {
    const row = this.database
      .prepare<[string], UserRow>(
        `
          SELECT id, email, name, created_at
          FROM users
          WHERE email = ?
        `,
      )
      .get(email);

    return row ? mapUserRow(row) : null;
  }
}
