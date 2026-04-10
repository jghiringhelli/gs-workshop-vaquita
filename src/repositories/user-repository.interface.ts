import { User } from '../types';

/**
 * Repository interface for User persistence
 */
export interface IUserRepository {
  /**
   * Create a new user
   * @param email - User email
   * @param name - User name
   * @returns Created user
   */
  create(email: string, name: string): User;

  /**
   * Get user by ID
   * @param id - User ID
   * @returns User or null
   */
  getById(id: string): User | null;

  /**
   * Get user by email
   * @param email - User email
   * @returns User or null
   */
  getByEmail(email: string): User | null;

  /**
   * List all users
   * @returns Array of users
   */
  list(): User[];
}
