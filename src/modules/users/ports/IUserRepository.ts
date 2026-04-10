import { User, CreateUserInput } from '../domain/User';

/** Port interface — all persistence for users must go through this. */
export interface IUserRepository {
  /**
   * Creates a new user.
   * @param input - email and name.
   * @returns The created user.
   */
  create(input: CreateUserInput): User;

  /** Lists all users. */
  listAll(): User[];

  /**
   * Finds a user by primary key.
   * @param id - User UUID.
   * @returns User or undefined.
   */
  findById(id: string): User | undefined;

  /**
   * Finds a user by email address.
   * @param email - Email to look up.
   * @returns User or undefined.
   */
  findByEmail(email: string): User | undefined;
}
