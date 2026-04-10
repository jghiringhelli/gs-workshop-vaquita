import { ConflictError, NotFoundError } from "../errors/app-error";

import { type CreateUserInput, type User } from "./user.types";
import { UserRepository } from "./user.repository";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  createUser(input: CreateUserInput): User {
    const existingUser = this.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictError(`A user with email ${input.email} already exists`);
    }

    return this.userRepository.create(input);
  }

  listUsers(): User[] {
    return this.userRepository.list();
  }

  getUserById(id: number): User {
    const user = this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError(`User ${id} was not found`);
    }

    return user;
  }
}
