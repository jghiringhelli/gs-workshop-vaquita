import type Database from "better-sqlite3";

import type { UserRepository } from "./userRepository";
import type { CreateUserInput, User } from "./userTypes";

interface UserRow {
  readonly id: number;
  readonly email: string;
  readonly name: string;
}

/**
 * SQLite-backed implementation of the user repository port.
 */
export class SqliteUserRepository implements UserRepository {
  /**
   * Create a repository instance.
   *
   * @param database Open SQLite database connection.
   */
  public constructor(private readonly database: Database.Database) {}

  /**
   * Persist a new user.
   *
   * @param input User creation input.
   * @returns Created user.
   */
  public create(input: CreateUserInput): User {
    const createdAt = new Date().toISOString();
    const statement = this.database.prepare(
      "INSERT INTO users (email, name, created_at) VALUES (?, ?, ?)",
    );
    const result = statement.run(input.email, input.name, createdAt);
    return this.findById(Number(result.lastInsertRowid)) as User;
  }

  /**
   * List all users.
   *
   * @returns Ordered list of users.
   */
  public list(): ReadonlyArray<User> {
    const rows = this.database
      .prepare("SELECT id, email, name FROM users ORDER BY id ASC")
      .all() as ReadonlyArray<UserRow>;
    return rows.map(mapUserRow);
  }

  /**
   * Find a user by identifier.
   *
   * @param id User identifier.
   * @returns Matching user or null.
   */
  public findById(id: number): User | null {
    const row = this.database
      .prepare("SELECT id, email, name FROM users WHERE id = ?")
      .get(id) as UserRow | undefined;
    return row ? mapUserRow(row) : null;
  }

  /**
   * Find a user by email address.
   *
   * @param email User email address.
   * @returns Matching user or null.
   */
  public findByEmail(email: string): User | null {
    const row = this.database
      .prepare("SELECT id, email, name FROM users WHERE email = ?")
      .get(email) as UserRow | undefined;
    return row ? mapUserRow(row) : null;
  }
}

/**
 * Map a database row to the public user shape.
 *
 * @param row Raw database row.
 * @returns Public user object.
 */
function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
  };
}
