import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity.js';
import { IUserRepository } from './user.port.js';

interface UserRow {
  id: string;
  email: string;
  name: string;
}

/**
 * SQLite implementation of IUserRepository.
 */
export class UserRepository implements IUserRepository {
  /** @param db - The shared SQLite connection */
  constructor(private readonly db: Database.Database) {}

  /**
   * Persists a new user.
   * @param data - User fields excluding the generated id
   * @returns The created User with id
   */
  create(data: Omit<User, 'id'>): User {
    const id = uuidv4();
    this.db
      .prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)')
      .run(id, data.email, data.name);
    return { id, ...data };
  }

  /**
   * Finds a user by id.
   * @param id - UUID of the user
   * @returns The User or null if not found
   */
  findById(id: string): User | null {
    const row = this.db
      .prepare('SELECT id, email, name FROM users WHERE id = ?')
      .get(id) as UserRow | undefined;
    return row ?? null;
  }

  /**
   * Lists all users.
   * @returns Array of all User records
   */
  findAll(): User[] {
    return this.db.prepare('SELECT id, email, name FROM users').all() as User[];
  }

  /**
   * Finds a user by email address.
   * @param email - Email to look up
   * @returns The User or null if not found
   */
  findByEmail(email: string): User | null {
    const row = this.db
      .prepare('SELECT id, email, name FROM users WHERE email = ?')
      .get(email) as UserRow | undefined;
    return row ?? null;
  }
}

