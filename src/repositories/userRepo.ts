import db from '../db';

export interface UserRow {
  id: number;
  email: string;
  name: string;
}

export const userRepo = {
  create(email: string, name: string): UserRow {
    const stmt = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
    const result = stmt.run(email, name);
    return { id: result.lastInsertRowid as number, email, name };
  },

  findAll(): UserRow[] {
    return db.prepare('SELECT * FROM users').all() as UserRow[];
  },

  findById(id: number): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  },

  findByEmail(email: string): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  },
};
