import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  name: string;
}

export const userRepository = {
  create(email: string, name: string): User {
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(id, email, name);
    return { id, email, name };
  },

  findAll(): User[] {
    return db.prepare('SELECT * FROM users').all() as User[];
  },

  findById(id: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  },

  findByEmail(email: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  },
};
