import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db';
import type { CreateUserInput } from './user.schemas';

/** Represents a user record as returned from the database. */
export interface User {
  id: string;
  email: string;
  name: string;
}

/**
 * Finds a user by their primary key.
 *
 * @param id - The user's UUID.
 * @returns The user record, or undefined if not found.
 */
export function findUserById(id: string): User | undefined {
  const db = getDb();
  return db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(id) as
    | User
    | undefined;
}

/**
 * Finds a user by their email address.
 *
 * @param email - The user's email address.
 * @returns The user record, or undefined if not found.
 */
export function findUserByEmail(email: string): User | undefined {
  const db = getDb();
  return db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email) as
    | User
    | undefined;
}

/**
 * Returns all users ordered alphabetically by name.
 *
 * @returns Array of user records.
 */
export function findAllUsers(): User[] {
  const db = getDb();
  return db.prepare('SELECT id, email, name FROM users ORDER BY name').all() as User[];
}

/**
 * Inserts a new user record and returns it.
 *
 * @param input - Validated user creation data.
 * @returns The newly created user.
 */
export function createUser(input: CreateUserInput): User {
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)').run(
    id,
    input.email,
    input.name,
  );
  return { id, email: input.email, name: input.name };
}
