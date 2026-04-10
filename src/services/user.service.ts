/**
 * User service — business logic for users.
 */
import { userRepository } from "../repositories/user.repository";
import { ConflictError, NotFoundError } from "../errors";
import { toSafeUser, type SafeUser } from "./auth.service";

export const userService = {
  async createUser(data: { email: string; name: string }): Promise<SafeUser> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError(`User with email ${data.email} already exists`);
    }
    const user = await userRepository.create(data);
    return toSafeUser(user);
  },

  async getUserById(id: number): Promise<SafeUser> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }
    return toSafeUser(user);
  },

  async listUsers(): Promise<SafeUser[]> {
    const users = await userRepository.findAll();
    return users.map(toSafeUser);
  },
};

