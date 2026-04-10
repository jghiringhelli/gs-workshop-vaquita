import Database from 'better-sqlite3';

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export function createUserRepository(db: Database.Database) {
  return {
    findById(id: number): User | undefined {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    },
    findByEmail(email: string): User | undefined {
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    },
    findAll(): User[] {
      return db.prepare('SELECT * FROM users').all() as User[];
    },
    create(data: { email: string; name: string }): User {
      const result = db
        .prepare('INSERT INTO users (email, name) VALUES (?, ?) RETURNING *')
        .get(data.email, data.name) as User;
      return result;
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
