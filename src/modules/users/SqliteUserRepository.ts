import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { User, CreateUserDto } from './User';
import { IUserRepository } from './IUserRepository';

interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

function rowToUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}

export class SqliteUserRepository implements IUserRepository {
  constructor(private readonly db: Database.Database) {}

  create(dto: CreateUserDto): User {
    const user: User = {
      id: uuidv4(),
      email: dto.email,
      name: dto.name,
      createdAt: new Date().toISOString(),
    };
    this.db
      .prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)')
      .run(user.id, user.email, user.name, user.createdAt);
    return user;
  }

  findById(id: string): User | null {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row ? rowToUser(row) : null;
  }

  findAll(): User[] {
    const rows = this.db
      .prepare('SELECT * FROM users ORDER BY created_at DESC')
      .all() as UserRow[];
    return rows.map(rowToUser);
  }

  findByEmail(email: string): User | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as UserRow | undefined;
    return row ? rowToUser(row) : null;
  }
}
