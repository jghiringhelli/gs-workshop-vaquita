import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { IUserRepository } from './user.repository.interface';
import { User, UserRow, CreateUserDTO } from './user.types';

/**
 * SQLite implementation of IUserRepository.
 * Responsible for mapping between UserRow (DB columns) and User (domain entity).
 */
export class UserRepository implements IUserRepository {
  /**
   * @param db - Open better-sqlite3 database connection
   */
  constructor(private readonly db: Database.Database) {}

  /**
   * Inserts a new user row and returns the created domain entity.
   * @param dto - Validated creation data
   */
  create(dto: CreateUserDTO): User {
    const id = uuidv4();
    this.db
      .prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)')
      .run(id, dto.email, dto.name);

    const created = this.findById(id);
    if (!created) throw new Error(`Failed to retrieve user after insert: ${id}`);
    return created;
  }

  /**
   * Finds a user by primary key.
   * @param id - User UUID
   */
  findById(id: string): User | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as UserRow | undefined;
    return row ? rowToUser(row) : null;
  }

  /**
   * Finds a user by email address.
   * @param email - Email to look up
   */
  findByEmail(email: string): User | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as UserRow | undefined;
    return row ? rowToUser(row) : null;
  }

  /**
   * Returns all users ordered by creation date descending.
   */
  findAll(): User[] {
    const rows = this.db
      .prepare('SELECT * FROM users ORDER BY created_at DESC')
      .all() as UserRow[];
    return rows.map(rowToUser);
  }
}

/**
 * Maps a raw database row to the domain User entity.
 * @param row - Database row with snake_case columns
 */
function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  };
}
