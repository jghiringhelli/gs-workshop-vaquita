import Database from "better-sqlite3";

import { db } from "../../db/database";
import { ConflictError, InternalInvariantError } from "../../errors/app-error";

export type UserRecord = {
  id: number;
  email: string;
  name: string;
};

type UserRow = UserRecord & {
  created_at: string;
};

type InsertUserInput = {
  email: string;
  name: string;
};

export class UsersRepository {
  public create(input: InsertUserInput): UserRecord {
    try {
      const result = db
        .prepare(
          `
            INSERT INTO users (email, name)
            VALUES (@email, @name)
          `,
        )
        .run(input);

      const createdUser = db
        .prepare(
          `
            SELECT id, email, name, created_at
            FROM users
            WHERE id = ?
          `,
        )
        .get(result.lastInsertRowid) as UserRow | undefined;

      if (!createdUser) {
        throw new InternalInvariantError("User insertion succeeded but no row was returned.");
      }

      return mapUserRow(createdUser);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictError("A user with that email already exists.");
      }

      throw error;
    }
  }

  public findAll(): UserRecord[] {
    const rows = db
      .prepare(
        `
          SELECT id, email, name, created_at
          FROM users
          ORDER BY id ASC
        `,
      )
      .all() as UserRow[];

    return rows.map(mapUserRow);
  }

  public findById(id: number): UserRecord | null {
    const row = db
      .prepare(
        `
          SELECT id, email, name, created_at
          FROM users
          WHERE id = ?
        `,
      )
      .get(id) as UserRow | undefined;

    return row ? mapUserRow(row) : null;
  }
}

function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE";
}