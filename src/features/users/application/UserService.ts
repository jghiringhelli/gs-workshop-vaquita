import { ConflictError, NotFoundError } from "../../../shared/errors/AppError";
import type { CreateUserInput, User } from "../domain/User";
import type { UserRepository } from "../domain/UserRepository";

export interface UserServiceDependencies {
  readonly userRepository: UserRepository;
}

/**
 * Coordinate user-related use cases.
 */
export class UserService {
  public constructor(private readonly dependencies: UserServiceDependencies) {}

  /**
   * Create a new user if their email is not already registered.
   *
   * @param input The user input data.
   * @returns The created user.
   */
  public createUser(input: CreateUserInput): User {
    const existingUser = this.dependencies.userRepository.getByEmail(input.email);
    if (existingUser) {
      throw new ConflictError(`User with email ${input.email} already exists`);
    }

    return this.dependencies.userRepository.create(input);
  }

  /**
   * Return every registered user.
   *
   * @returns The existing users.
   */
  public listUsers(): readonly User[] {
    return this.dependencies.userRepository.list();
  }

  /**
   * Return a single user by identifier.
   *
   * @param userId The user identifier.
   * @returns The matching user.
   */
  public getUserById(userId: number): User {
    const user = this.dependencies.userRepository.getById(userId);
    if (!user) {
      throw new NotFoundError(`User ${userId} was not found`);
    }

    return user;
  }
}
