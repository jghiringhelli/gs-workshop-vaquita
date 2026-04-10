import { NotFoundError } from "../../lib/errors";

import type { UserRepository } from "./users.repository";
import type { CreateUserInput, User } from "./users.types";

export interface UsersService {
  createUser(input: CreateUserInput): User;
  getUserById(id: number): User;
  listUsers(): ReadonlyArray<User>;
}

export class DefaultUsersService implements UsersService {
  public constructor(private readonly userRepository: UserRepository) {}

  /**
   * Creates a user.
   * @param input User creation payload.
   * @returns Persisted user.
   */
  public createUser(input: CreateUserInput): User {
    return this.userRepository.create({
      email: input.email.toLowerCase(),
      name: input.name,
    });
  }

  /**
   * Returns a user by identifier.
   * @param id User identifier.
   * @returns Matching user.
   */
  public getUserById(id: number): User {
    const user = this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User not found.", { details: { id } });
    }

    return user;
  }

  /**
   * Lists all registered users.
   * @returns User collection.
   */
  public listUsers(): ReadonlyArray<User> {
    return this.userRepository.list();
  }
}