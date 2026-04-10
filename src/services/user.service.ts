/**
 * User service — business logic for users.
 */
import type { User } from "@prisma/client";
import { userRepository } from "../repositories/user.repository";
import { ConflictError, NotFoundError } from "../errors";

export const userService = {
  async createUser(data: { email: string; name: string }): Promise<User> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError(`User with email ${data.email} already exists`);
    }
    return userRepository.create(data);
  },

  async getUserById(id: number): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }
    return user;
  },

  async listUsers(): Promise<User[]> {
    return userRepository.findAll();
  },
};

