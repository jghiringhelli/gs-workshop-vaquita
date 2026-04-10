import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db.js';
import { User } from '../domain/index.js';
import { IUserRepository } from '../domain/repositories.js';

export class UserRepository implements IUserRepository {
  /**
   * Creates a new user
   * @param userData - The user data without id
   * @returns The created user
   */
  async create(userData: Omit<User, 'id'>): Promise<User> {
    const id = uuidv4();
    await dbRun(
      'INSERT INTO users (id, email, name) VALUES (?, ?, ?)',
      [id, userData.email, userData.name]
    );
    return { id, ...userData };
  }

  /**
   * Finds a user by id
   * @param id - The user id
   * @returns The user or null
   */
  async findById(id: string): Promise<User | null> {
    const row = await dbGet('SELECT id, email, name FROM users WHERE id = ?', [id]);
    return row as User | null;
  }

  /**
   * Finds a user by email
   * @param email - The user email
   * @returns The user or null
   */
  async findByEmail(email: string): Promise<User | null> {
    const row = await dbGet('SELECT id, email, name FROM users WHERE email = ?', [email]);
    return row as User | null;
  }

  /**
   * Lists all users
   * @returns Array of users
   */
  async list(): Promise<User[]> {
    const rows = await dbAll('SELECT id, email, name FROM users ORDER BY created_at DESC', []);
    return rows as User[];
  }
}