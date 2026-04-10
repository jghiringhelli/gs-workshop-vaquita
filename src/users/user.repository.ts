import type { CreateUserDto, User } from "./user.types.js";

/**
 * Persistence contract for user data.
 * Implementations must not leak SQL into callers.
 */
export interface IUserRepository {
  /** Persists a new user and returns the created record. */
  create(user: User): User;

  /** Returns a user by ID, or null if not found. */
  findById(id: string): User | null;

  /** Returns a user by email, or null if not found. */
  findByEmail(email: string): User | null;

  /** Returns all users ordered by creation date. */
  findAll(): User[];
}
