import type Database from "better-sqlite3";
import type { IUserRepository } from "./user.repository.js";
import type { User } from "./user.types.js";

interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

/** SQLite implementation of IUserRepository using better-sqlite3. */
export class SqliteUserRepository implements IUserRepository {
  constructor(private readonly db: Database.Database) {}

  /** @inheritdoc */
  create(user: User): User {
    this.db
      .prepare(
        "INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)"
      )
      .run(user.id, user.email, user.name, user.createdAt);
    return user;
  }

  /** @inheritdoc */
  findById(id: string): User | null {
    const row = this.db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id) as UserRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  /** @inheritdoc */
  findByEmail(email: string): User | null {
    const row = this.db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as UserRow | undefined;
    return row ? this.toEntity(row) : null;
  }

  /** @inheritdoc */
  findAll(): User[] {
    const rows = this.db
      .prepare("SELECT * FROM users ORDER BY created_at ASC")
      .all() as UserRow[];
    return rows.map((r) => this.toEntity(r));
  }

  private toEntity(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
    };
  }
}
