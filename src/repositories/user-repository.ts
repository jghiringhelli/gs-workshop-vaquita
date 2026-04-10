import { getDb } from "../db/database";
import type { User } from "../domain/models";

interface UserRow {
  id: number;
  email: string;
  name: string;
}

function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name };
}

/**
 * Repository for User persistence.
 */
export class UserRepository {
  /**
   * Inserts a new user and returns the created record.
   * @param email - unique email address
   * @param name - display name
   * @returns created User
   */
  create(email: string, name: string): User {
    const stmt = getDb().prepare(
      "INSERT INTO users (email, name) VALUES (?, ?) RETURNING *",
    );
    return toUser(stmt.get(email, name) as UserRow);
  }

  /**
   * Finds a user by primary key.
   * @param id - user id
   * @returns User or null
   */
  findById(id: number): User | null {
    const row = getDb()
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  /**
   * Finds a user by email address.
   * @param email - unique email
   * @returns User or null
   */
  findByEmail(email: string): User | null {
    const row = getDb()
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  /**
   * Returns all users ordered by id.
   * @returns User[]
   */
  findAll(): User[] {
    return (getDb().prepare("SELECT * FROM users ORDER BY id").all() as UserRow[]).map(toUser);
  }
}
