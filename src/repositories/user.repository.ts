import Database from "better-sqlite3";
import { User } from "../domain/types";

export interface CreateUserInput {
  email: string;
  name: string;
}

export interface UserRepository {
  create(input: CreateUserInput): User;
  list(): User[];
  findById(id: number): User | null;
}

export class SqliteUserRepository implements UserRepository {
  public constructor(private readonly database: Database.Database) {}

  /**
   * Creates a user.
   * @param input User creation payload.
   * @returns Created user record.
   */
  public create(input: CreateUserInput): User {
    const statement = this.database.prepare(
      `INSERT INTO users (email, name, created_at)
       VALUES (?, ?, ?)`
    );
    const result = statement.run(input.email, input.name, new Date().toISOString());
    return this.findById(Number(result.lastInsertRowid)) as User;
  }

  /**
   * Lists all users.
   * @returns Array of users.
   */
  public list(): User[] {
    const rows = this.database.prepare(`SELECT id, email, name FROM users ORDER BY id ASC`).all() as User[];
    return rows;
  }

  /**
   * Finds a user by identifier.
   * @param id User identifier.
   * @returns User or null.
   */
  public findById(id: number): User | null {
    const row = this.database
      .prepare(`SELECT id, email, name FROM users WHERE id = ?`)
      .get(id) as User | undefined;
    return row ?? null;
  }
}
