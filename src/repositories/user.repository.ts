import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { User, CreateUserDto } from '../users/types';

/** Contract for user persistence operations. */
export interface IUserRepository {
  /**
   * Persists a new user.
   * @param dto - User creation data.
   * @returns The created User entity.
   */
  create(dto: CreateUserDto): User;

  /**
   * Finds a user by primary key.
   * @param id - User UUID.
   * @returns User entity or null if not found.
   */
  findById(id: string): User | null;

  /**
   * Finds a user by email address.
   * @param email - Email address.
   * @returns User entity or null if not found.
   */
  findByEmail(email: string): User | null;

  /**
   * Returns all users ordered by creation date.
   * @returns Read-only array of User entities.
   */
  findAll(): ReadonlyArray<User>;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  };
}

/** SQLite-backed implementation of IUserRepository. */
export class SqliteUserRepository implements IUserRepository {
  constructor(private readonly db: Database.Database) {}

  create(dto: CreateUserDto): User {
    const id = uuidv4();
    this.db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(id, dto.email, dto.name);
    return this.findById(id) as User;
  }

  findById(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? rowToUser(row) : null;
  }

  findByEmail(email: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    return row ? rowToUser(row) : null;
  }

  findAll(): ReadonlyArray<User> {
    const rows = this.db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as UserRow[];
    return rows.map(rowToUser);
  }
}
