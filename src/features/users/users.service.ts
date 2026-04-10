import { NotImplementedAppError } from "../../lib/errors";

import type { UserRepository } from "./users.repository";
import type { CreateUserInput, User } from "./users.types";

export interface UsersService {
  createUser(input: CreateUserInput): User;
  getUserById(id: number): User;
  listUsers(): ReadonlyArray<User>;
}

export class DefaultUsersService implements UsersService {
  public constructor(private readonly userRepository: UserRepository) {
    void this.userRepository;
  }

  /**
   * Creates a user.
   * @param _input User creation payload.
   * @returns Persisted user.
   */
  public createUser(_input: CreateUserInput): User {
    throw new NotImplementedAppError("DefaultUsersService.createUser is not implemented yet.");
  }

  /**
   * Returns a user by identifier.
   * @param _id User identifier.
   * @returns Matching user.
   */
  public getUserById(_id: number): User {
    throw new NotImplementedAppError("DefaultUsersService.getUserById is not implemented yet.");
  }

  /**
   * Lists all registered users.
   * @returns User collection.
   */
  public listUsers(): ReadonlyArray<User> {
    throw new NotImplementedAppError("DefaultUsersService.listUsers is not implemented yet.");
  }
}