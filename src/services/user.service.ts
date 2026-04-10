import { z } from 'zod';
import { User } from '../types';
import { IUserRepository } from '../repositories/user-repository.interface';

/**
 * Custom errors for user domain
 */
export class UserEmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
    this.name = 'UserEmailAlreadyExistsError';
  }
}

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User with ID ${id} not found`);
    this.name = 'UserNotFoundError';
  }
}

/**
 * Input validation schemas
 */
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * User service - business logic layer
 */
export class UserService {
  /**
   * @param userRepository - User repository dependency
   */
  constructor(private userRepository: IUserRepository) {}

  /**
   * Create a new user with validation
   * @param email - User email
   * @param name - User name
   * @returns Created user
   * @throws UserEmailAlreadyExistsError if email exists
   */
  createUser(email: string, name: string): User {
    // Validate email uniqueness
    const existing = this.userRepository.getByEmail(email);
    if (existing) {
      throw new UserEmailAlreadyExistsError(email);
    }

    return this.userRepository.create(email, name);
  }

  /**
   * Get user by ID
   * @param id - User ID
   * @returns User
   * @throws UserNotFoundError if not found
   */
  getUserById(id: string): User {
    const user = this.userRepository.getById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }

  /**
   * List all users
   * @returns Array of users
   */
  listUsers(): User[] {
    return this.userRepository.list();
  }
}
