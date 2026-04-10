import type { User } from "../domain/models";
import { getDatabase } from "../db/database";

interface UserRow {
  id: number;
  email: string;
  name: string;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
  };
}

export class UserRepository {
  create(input: Pick<User, "email" | "name">): User {
    const db = getDatabase();

    const stmt = db.prepare(
      "INSERT INTO users (email, name) VALUES (?, ?) RETURNING id, email, name"
    );

    const row = stmt.get(input.email, input.name) as UserRow;
    return toUser(row);
  }

  list(): User[] {
    const db = getDatabase();
    const stmt = db.prepare("SELECT id, email, name FROM users ORDER BY id ASC");
    const rows = stmt.all() as UserRow[];
    return rows.map(toUser);
  }

  findById(id: number): User | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT id, email, name FROM users WHERE id = ?");
    const row = stmt.get(id) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  findByEmail(email: string): User | null {
    const db = getDatabase();
    const stmt = db.prepare("SELECT id, email, name FROM users WHERE email = ?");
    const row = stmt.get(email) as UserRow | undefined;
    return row ? toUser(row) : null;
  }
}
