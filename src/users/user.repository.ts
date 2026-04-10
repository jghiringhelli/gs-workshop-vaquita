import { type DatabaseConnection } from "../db/database";

import { type CreateUserInput, type User } from "./user.types";

interface UserRow {
  id: number;
  email: string;
  name: string;
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
  };
}

export class UserRepository {
  constructor(private readonly db: DatabaseConnection) {}

  create(input: CreateUserInput): User {
    const statement = this.db.prepare(`
      INSERT INTO users (email, name)
      VALUES (@email, @name)
    `);

    const result = statement.run(input);

    return this.findById(Number(result.lastInsertRowid)) as User;
  }

  list(): User[] {
    const statement = this.db.prepare(`
      SELECT id, email, name
      FROM users
      ORDER BY id ASC
    `);

    const rows = statement.all() as UserRow[];

    return rows.map(mapUserRow);
  }

  findById(id: number): User | undefined {
    const statement = this.db.prepare(`
      SELECT id, email, name
      FROM users
      WHERE id = ?
    `);

    const row = statement.get(id) as UserRow | undefined;

    return row ? mapUserRow(row) : undefined;
  }

  findByEmail(email: string): User | undefined {
    const statement = this.db.prepare(`
      SELECT id, email, name
      FROM users
      WHERE email = ?
    `);

    const row = statement.get(email) as UserRow | undefined;

    return row ? mapUserRow(row) : undefined;
  }
}
