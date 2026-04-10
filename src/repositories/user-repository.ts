import { db } from "../db/database";
import { CreateUserInput, User } from "../domain/models";

function mapUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
  };
}

export const userRepository = {
  create(input: CreateUserInput): User {
    const insert = db.prepare(
      `INSERT INTO users (email, name) VALUES (?, ?)`
    );
    const result = insert.run(input.email, input.name);
    return this.findById(Number(result.lastInsertRowid)) as User;
  },

  list(): User[] {
    const rows = db.prepare(`SELECT id, email, name FROM users ORDER BY id`).all() as Record<string, unknown>[];
    return rows.map(mapUser);
  },

  findById(id: number): User | null {
    const row = db
      .prepare(`SELECT id, email, name FROM users WHERE id = ?`)
      .get(id) as Record<string, unknown> | undefined;
    return row ? mapUser(row) : null;
  },

  findByEmail(email: string): User | null {
    const row = db
      .prepare(`SELECT id, email, name FROM users WHERE email = ?`)
      .get(email) as Record<string, unknown> | undefined;
    return row ? mapUser(row) : null;
  },
};
