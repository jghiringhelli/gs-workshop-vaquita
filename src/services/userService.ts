import { ConflictError, NotFoundError } from '../errors';
import { UserRepository } from '../repositories/userRepository';

export function createUserService(userRepo: UserRepository) {
  return {
    async createUser(data: { email: string; name: string }) {
      const existing = userRepo.findByEmail(data.email);
      if (existing) {
        throw new ConflictError(`User with email ${data.email} already exists`);
      }
      return userRepo.create(data);
    },

    async getUser(id: number) {
      const user = userRepo.findById(id);
      if (!user) {
        throw new NotFoundError(`User ${id} not found`);
      }
      return user;
    },

    async listUsers() {
      return userRepo.findAll();
    },

    async getUserByEmail(email: string) {
      const user = userRepo.findByEmail(email);
      if (!user) {
        throw new NotFoundError(`User with email ${email} not found`);
      }
      return user;
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
