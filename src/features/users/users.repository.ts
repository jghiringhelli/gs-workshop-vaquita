import type Database from "better-sqlite3";

import { AppError, ConflictError } from "../../lib/errors";
import type { CreateUserInput, User } from "./users.types";

interface UserRow {
  readonly id: number;
  readonly email: string;
  readonly name: string;
  readonly created_at: string;
}

export interface UserRepository {
  create(input: CreateUserInput): User;
  findById(id: number): User | null;
  findByEmail(email: string): User | null;
  list(): ReadonlyArray<User>;
}

export class SqliteUserRepository implements UserRepository {
  public constructor(private readonly database: Database.Database) {}

  /**
   * Persists a user in SQLite.
   * @param input User creation payload.
   * @returns Persisted user projection.
   */
  public create(input: CreateUserInput): User {
    try {
      const result = this.database
        .prepare(
          `INSERT INTO users (email, name)
           VALUES (?, ?)`,
        )
        .run(input.email, input.name);

      const user = this.findById(Number(result.lastInsertRowid));
      if (!user) {
        throw new AppError("Failed to reload persisted user.", 500, "PERSISTENCE_ERROR");
      }

      return user;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictError("A user with this email already exists.", {
          details: { email: input.email },
        });
      }

      throw error;
    }
  }

  /**
   * Finds a user by identifier.
   * @param id User identifier.
   * @returns Matching user or null.
   */
  public findById(id: number): User | null {
    const row = this.database
      .prepare(
        `SELECT id, email, name, created_at
         FROM users
         WHERE id = ?`,
      )
      .get(id) as UserRow | undefined;

    return row ? mapUserRow(row) : null;
  }

  /**
   * Finds a user by email.
   * @param email User email.
   * @returns Matching user or null.
   */
  public findByEmail(email: string): User | null {
    const row = this.database
      .prepare(
        `SELECT id, email, name, created_at
         FROM users
         WHERE email = ?`,
      )
      .get(email) as UserRow | undefined;

    return row ? mapUserRow(row) : null;
  }

  /**
   * Lists all registered users.
   * @returns All users.
   */
  public list(): ReadonlyArray<User> {
    const rows = this.database
      .prepare(
        `SELECT id, email, name, created_at
         FROM users
         ORDER BY id ASC`,
      )
      .all() as ReadonlyArray<UserRow>;

    return rows.map(mapUserRow);
  }
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  return error.code === "SQLITE_CONSTRAINT_UNIQUE";
}