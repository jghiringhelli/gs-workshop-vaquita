import { ConflictError, NotFoundError } from "../../shared/errors";
import type { UserRepository } from "./userRepository";
import type { CreateUserInput, User } from "./userTypes";

/**
 * Application service for user workflows.
 */
export class UserService {
  /**
   * Create a service instance.
   *
   * @param userRepository User repository dependency.
   */
  public constructor(private readonly userRepository: UserRepository) {}

  /**
   * Create a new user.
   *
   * @param input User creation input.
   * @returns Created user.
   */
  public createUser(input: CreateUserInput): User {
    const existingUser = this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError("A user with that email already exists");
    }

    return this.userRepository.create(input);
  }

  /**
   * List all users.
   *
   * @returns Ordered list of users.
   */
  public listUsers(): ReadonlyArray<User> {
    return this.userRepository.list();
  }

  /**
   * Get a user by identifier.
   *
   * @param userId User identifier.
   * @returns Matching user.
   */
  public getUserById(userId: number): User {
    const user = this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User ${userId} was not found`);
    }

    return user;
  }
}
