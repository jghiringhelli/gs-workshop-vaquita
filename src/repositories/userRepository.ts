import { getDb } from "../db/database";
import { User } from "../types";

export const userRepository = {
  create(email: string, name: string): User {
    const db = getDb();
    const stmt = db.prepare("INSERT INTO users (email, name) VALUES (?, ?)");
    const result = stmt.run(email, name);
    return { id: Number(result.lastInsertRowid), email, name };
  },

  findById(id: number): User | undefined {
    const db = getDb();
    const stmt = db.prepare("SELECT id, email, name FROM users WHERE id = ?");
    return stmt.get(id) as User | undefined;
  },

  findAll(): User[] {
    const db = getDb();
    const stmt = db.prepare("SELECT id, email, name FROM users");
    return stmt.all() as User[];
  },

  findByEmail(email: string): User | undefined {
    const db = getDb();
    const stmt = db.prepare(
      "SELECT id, email, name FROM users WHERE email = ?",
    );
    return stmt.get(email) as User | undefined;
  },
};
