import { getDb } from "../db/database.js";

export interface UserRow {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export const userRepository = {
  create(email: string, name: string): UserRow {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO users (email, name) VALUES (?, ?)"
    );
    const result = stmt.run(email, name);
    return this.findById(result.lastInsertRowid as number)!;
  },

  findAll(): UserRow[] {
    const db = getDb();
    return db.prepare("SELECT * FROM users").all() as UserRow[];
  },

  findById(id: number): UserRow | undefined {
    const db = getDb();
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      | UserRow
      | undefined;
  },

  findByEmail(email: string): UserRow | undefined {
    const db = getDb();
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
      | UserRow
      | undefined;
  },
};
