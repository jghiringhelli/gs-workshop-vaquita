import type Database from "better-sqlite3"
import type {
  CreateUserInput,
  PaginatedResult,
  PaginationInput,
  UserRecord,
  UserRepository,
} from "./types"

/**
 * SQLite adapter for user persistence.
 */
export class SqliteUserRepository implements UserRepository {
  /**
   * Create a SQLite-backed user repository.
   *
   * @param database - SQLite database handle.
   */
  public constructor(private readonly database: Database.Database) {}

  /**
   * Persist a new user.
   *
   * @param input - User creation input.
   * @returns Persisted user record.
   */
  public create(input: CreateUserInput & { readonly createdAt: string }): UserRecord {
    const result = this.database
      .prepare(
        `
          INSERT INTO users (email, name, created_at)
          VALUES (@email, @name, @createdAt)
        `,
      )
      .run({
        email: input.email,
        name: input.name,
        createdAt: input.createdAt,
      })

    return this.findById(Number(result.lastInsertRowid)) as UserRecord
  }

  /**
   * Find a user by email address.
   *
   * @param email - Email address to look up.
   * @returns Matching user or null.
   */
  public findByEmail(email: string): UserRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT id, email, name, created_at
          FROM users
          WHERE email = ?
        `,
      )
      .get(email) as UserRow | undefined

    return row ? mapUserRow(row) : null
  }

  /**
   * Find a user by id.
   *
   * @param id - User id.
   * @returns Matching user or null.
   */
  public findById(id: number): UserRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT id, email, name, created_at
          FROM users
          WHERE id = ?
        `,
      )
      .get(id) as UserRow | undefined

    return row ? mapUserRow(row) : null
  }

  /**
   * List users with pagination.
   *
   * @param pagination - Pagination request.
   * @returns Paginated user records.
   */
  public list(pagination: PaginationInput): PaginatedResult<UserRecord> {
    const offset = (pagination.page - 1) * pagination.pageSize
    const rows = this.database
      .prepare(
        `
          SELECT id, email, name, created_at
          FROM users
          ORDER BY id ASC
          LIMIT ? OFFSET ?
        `,
      )
      .all(pagination.pageSize, offset) as UserRow[]

    const countRow = this.database
      .prepare("SELECT COUNT(*) as total FROM users")
      .get() as { total: number }

    return {
      items: rows.map(mapUserRow),
      total: countRow.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
  }
}

interface UserRow {
  readonly id: number
  readonly email: string
  readonly name: string
  readonly created_at: string
}

/**
 * Convert a SQLite row to a user record.
 *
 * @param row - Raw SQLite row.
 * @returns Normalized user record.
 */
function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  }
}
