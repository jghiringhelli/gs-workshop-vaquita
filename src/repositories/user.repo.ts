import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import type { User } from '../types';

/**
 * Persists a new user row.
 * @param email - Unique email
 * @param name - Display name
 * @returns Created User
 */
export function createUser(email: string, name: string): User {
  const id = uuidv4();
  getDb().prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(id, email, name);
  return { id, email, name };
}

/**
 * Finds a user by primary key.
 * @param id - User UUID
 * @returns User or undefined
 */
export function findUserById(id: string): User | undefined {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

/**
 * Finds a user by email address.
 * @param email - Email to look up
 * @returns User or undefined
 */
export function findUserByEmail(email: string): User | undefined {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
}

/**
 * Returns all users.
 * @returns Array of User
 */
export function findAllUsers(): User[] {
  return getDb().prepare('SELECT * FROM users').all() as User[];
}
