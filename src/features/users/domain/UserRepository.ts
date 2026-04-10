import type { CreateUserInput, User } from "./User";

export interface UserRepository {
  /**
   * Create a new user.
   *
   * @param input The user data to persist.
   * @returns The created user.
   */
  create(input: CreateUserInput): User;

  /**
   * List all persisted users.
   *
   * @returns The existing users ordered by insertion.
   */
  list(): readonly User[];

  /**
   * Look up a user by their identifier.
   *
   * @param userId The user identifier.
   * @returns The user when found, otherwise null.
   */
  getById(userId: number): User | null;

  /**
   * Look up a user by their email address.
   *
   * @param email The email to search for.
   * @returns The user when found, otherwise null.
   */
  getByEmail(email: string): User | null;
}
