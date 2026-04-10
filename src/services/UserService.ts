/**
 * User Service
 * Contains business logic for user management
 */

import { Repositories } from '../types/index.js';
import { ConflictError, NotFoundError } from '../errors/index.js';

interface CreateUserInput {
  email: string;
  name: string;
}

export class UserService {
  constructor(private repositories: Repositories) {}

  /**
   * Create a new user
   * - Email must be unique
   */
  createUser(input: CreateUserInput) {
    // Check if email already exists
    const existing = this.repositories.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`User with email ${input.email} already exists`);
    }

    return this.repositories.users.create({
      email: input.email,
      name: input.name,
    });
  }

  /**
   * Get user by ID
   */
  getUser(userId: string) {
    const user = this.repositories.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return user;
  }

  /**
   * List all users
   */
  listUsers() {
    return this.repositories.users.list();
  }
}
