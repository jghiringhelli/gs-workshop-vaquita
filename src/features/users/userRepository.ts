import type { CreateUserInput, User } from "./userTypes";

/**
 * Persistence contract for users.
 */
export interface UserRepository {
  /**
   * Persist a new user.
   *
   * @param input User creation input.
   * @returns Created user.
   */
  create(input: CreateUserInput): User;

  /**
   * List all users.
   *
   * @returns Ordered list of users.
   */
  list(): ReadonlyArray<User>;

  /**
   * Find a user by identifier.
   *
   * @param id User identifier.
   * @returns Matching user or null.
   */
  findById(id: number): User | null;

  /**
   * Find a user by email address.
   *
   * @param email User email address.
   * @returns Matching user or null.
   */
  findByEmail(email: string): User | null;
}
