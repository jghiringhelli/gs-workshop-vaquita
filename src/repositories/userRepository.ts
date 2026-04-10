import Database from "better-sqlite3";
import { User } from "../domain";

interface UserRow {
  id: number;
  email: string;
  name: string;
}

const mapUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
});

export class UserRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: { email: string; name: string }): User {
    const result = this.db
      .prepare("INSERT INTO users (email, name) VALUES (?, ?)")
      .run(input.email, input.name);

    return this.findById(Number(result.lastInsertRowid)) as User;
  }

  list(): User[] {
    const rows = this.db.prepare("SELECT id, email, name FROM users ORDER BY id").all() as UserRow[];
    return rows.map(mapUser);
  }

  findById(id: number): User | null {
    const row = this.db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(id) as UserRow | undefined;
    return row ? mapUser(row) : null;
  }

  findByEmail(email: string): User | null {
    const row = this.db
      .prepare("SELECT id, email, name FROM users WHERE email = ?")
      .get(email) as UserRow | undefined;

    return row ? mapUser(row) : null;
  }
}
