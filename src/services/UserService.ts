import type { User } from '../domain/types.js';
import type { IUserRepository } from '../domain/interfaces.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors/index.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Handles user creation and retrieval business logic. */
export class UserService {
  constructor(private readonly userRepo: IUserRepository) {}

  /**
   * Create a new user after validating the email format.
   * @param email - Must be a valid email address
   * @param name - Display name for the user
   * @returns The created User record
   * @throws {ValidationError} If email format is invalid
   * @throws {ConflictError} If the email is already registered
   */
  createUser(email: string, name: string): User {
    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError('Invalid email format');
    }
    try {
      return this.userRepo.create({ email, name });
    } catch (err) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
        throw new ConflictError('Email already in use');
      }
      throw err;
    }
  }

  /**
   * Retrieve a user by ID, throwing if not found.
   * @param id - UUID of the user
   * @returns The User record
   * @throws {NotFoundError} If no user with that id exists
   */
  getUserById(id: string): User {
    const user = this.userRepo.findById(id);
    if (!user) throw new NotFoundError(`User ${id} not found`);
    return user;
  }

  /**
   * Return all users.
   * @returns Array of all User records
   */
  listUsers(): User[] {
    return this.userRepo.findAll();
  }
}
