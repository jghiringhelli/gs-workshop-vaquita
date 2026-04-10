import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { User, CreateUserInput } from '../domain/User';
import { IUserRepository } from '../ports/IUserRepository';

/** SQLite adapter for the user repository port. */
export class SqliteUserRepository implements IUserRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateUserInput): User {
    const id = uuidv4();
    this.db
      .prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)')
      .run(id, input.email, input.name);
    return { id, email: input.email, name: input.name };
  }

  findById(id: string): User | undefined {
    return this.db
      .prepare('SELECT id, email, name FROM users WHERE id = ?')
      .get(id) as User | undefined;
  }

  findByEmail(email: string): User | undefined {
    return this.db
      .prepare('SELECT id, email, name FROM users WHERE email = ?')
      .get(email) as User | undefined;
  }
}
