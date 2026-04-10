import { ConflictError, NotFoundError } from "../errors/app-error";
import { CreateUserInput, UserRepository } from "../repositories/user.repository";
import { User } from "../domain/types";

export class UserService {
  public constructor(private readonly userRepository: UserRepository) {}

  /**
   * Creates a user.
   * @param input User creation payload.
   * @returns Created user.
   */
  public create(input: CreateUserInput): User {
    try {
      return this.userRepository.create(input);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create user";
      if (message.includes("UNIQUE")) {
        throw new ConflictError("Email already exists");
      }
      throw error;
    }
  }

  /**
   * Lists all users.
   * @returns User list.
   */
  public list(): User[] {
    return this.userRepository.list();
  }

  /**
   * Gets user by identifier.
   * @param id User identifier.
   * @returns Existing user.
   */
  public getById(id: number): User {
    const user = this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  }
}
