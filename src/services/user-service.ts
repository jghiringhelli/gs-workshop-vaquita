import { CreateUserInput, User } from "../domain/models";
import { ConflictError, NotFoundError } from "../errors/app-error";
import { userRepository } from "../repositories/user-repository";

export const userService = {
  create(input: CreateUserInput): User {
    const existing = userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("Email already exists");
    }
    return userRepository.create(input);
  },

  list(): User[] {
    return userRepository.list();
  },

  getById(id: number): User {
    const user = userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  },
};
