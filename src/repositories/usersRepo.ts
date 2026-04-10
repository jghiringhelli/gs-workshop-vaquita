import { v4 as uuidv4 } from 'uuid';
import type { DB } from '../db/db';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface CreateUserData {
  email: string;
  name: string;
}

export function createUsersRepo(db: DB) {
  return {
    findAll(): User[] {
      return db.prepare('SELECT * FROM users ORDER BY createdAt ASC').all() as User[];
    },

    findById(id: string): User | undefined {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    },

    findByEmail(email: string): User | undefined {
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    },

    create(data: CreateUserData): User {
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare('INSERT INTO users (id, email, name, createdAt) VALUES (?, ?, ?, ?)').run(
        id, data.email, data.name, now,
      );
      return this.findById(id)!;
    },
  };
}

export type UsersRepo = ReturnType<typeof createUsersRepo>;
