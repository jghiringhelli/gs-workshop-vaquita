import { userRepository } from "../repositories/userRepository.js";
import { ConflictError, NotFoundError } from "../errors/index.js";
import type { UserRow } from "../repositories/userRepository.js";

export const userService = {
  createUser(email: string, name: string): UserRow {
    const existing = userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError("Email already registered");
    }
    return userRepository.create(email, name);
  },

  getUsers(): UserRow[] {
    return userRepository.findAll();
  },

  getUserById(id: number): UserRow {
    const user = userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  },
};
