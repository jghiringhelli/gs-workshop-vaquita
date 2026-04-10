import { db } from '../../infrastructure/database';
import { v4 as uuidv4 } from 'uuid';

/** Represents a user account in the system. */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/**
 * Inserts a new user row and returns the created entity.
 *
 * @param email - The user's unique email address.
 * @param name - The user's display name.
 * @returns The newly created User.
 */
export function createUser(email: string, name: string): User {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO users (id, email, name, createdAt) VALUES (?, ?, ?, ?)',
  ).run(id, email, name, createdAt);
  return { id, email, name, createdAt };
}

/**
 * Finds a user by primary key.
 *
 * @param id - UUID of the user.
 * @returns The User or undefined if not found.
 */
export function findUserById(id: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
    | User
    | undefined;
}

/**
 * Finds a user by email address.
 *
 * @param email - Email to search for.
 * @returns The User or undefined if not found.
 */
export function findUserByEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | User
    | undefined;
}

/**
 * Returns all users in the database.
 *
 * @returns Array of User entities.
 */
export function listUsers(): User[] {
  return db.prepare('SELECT * FROM users').all() as User[];
}
