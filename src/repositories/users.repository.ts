import { InternalServerError } from "../errors/app-error";
import type { CreateUserInput, User, UserRow } from "../users/user.types";
import { mapUserRow } from "../users/user.types";

type DatabaseConnection = import("better-sqlite3").Database;

export class UsersRepository {
  constructor(private readonly db: DatabaseConnection) {}

  create(input: CreateUserInput): User {
    const insert = this.db.prepare<{ email: string; name: string }>(
      `
        INSERT INTO users (email, name)
        VALUES (@email, @name)
      `,
    );

    const result = insert.run({
      email: input.email,
      name: input.name,
    });

    const created = this.findById(Number(result.lastInsertRowid));

    if (!created) {
      throw new InternalServerError("User insert completed without returning a persisted record");
    }

    return created;
  }

  findById(id: number): User | null {
    const statement = this.db.prepare<[number], UserRow>(
      `
        SELECT id, email, name, created_at
        FROM users
        WHERE id = ?
      `,
    );

    const row = statement.get(id);

    return row ? mapUserRow(row) : null;
  }

  findByEmail(email: string): User | null {
    const statement = this.db.prepare<[string], UserRow>(
      `
        SELECT id, email, name, created_at
        FROM users
        WHERE email = ?
      `,
    );

    const row = statement.get(email);

    return row ? mapUserRow(row) : null;
  }

  list(): User[] {
    const statement = this.db.prepare<[], UserRow>(
      `
        SELECT id, email, name, created_at
        FROM users
        ORDER BY id ASC
      `,
    );

    return statement.all().map(mapUserRow);
  }
}
