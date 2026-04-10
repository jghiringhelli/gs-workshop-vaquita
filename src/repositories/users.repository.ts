import type Database from 'better-sqlite3';
import type { User } from '../types';

export function createUsersRepository(db: Database.Database) {
  return {
    findAll(): User[] {
      return db.prepare('SELECT * FROM users').all() as User[];
    },
    findById(id: number): User | undefined {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    },
    findByEmail(email: string): User | undefined {
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    },
    create(email: string, name: string): User {
      return db.prepare('INSERT INTO users (email, name) VALUES (?, ?) RETURNING *').get(email, name) as User;
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
