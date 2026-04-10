import { User } from './user.entity.js';

/**
 * Port interface for user persistence.
 * The domain layer owns this interface; infrastructure implements it.
 */
export interface IUserRepository {
  /**
   * Persists a new user.
   * @param data - User fields excluding the generated id
   * @returns The created User with id
   */
  create(data: Omit<User, 'id'>): User;

  /**
   * Finds a user by id.
   * @param id - UUID of the user
   * @returns The User or null if not found
   */
  findById(id: string): User | null;

  /**
   * Lists all users.
   * @returns Array of all User records
   */
  findAll(): User[];

  /**
   * Finds a user by email address.
   * @param email - Email to look up
   * @returns The User or null if not found
   */
  findByEmail(email: string): User | null;
}

