import { z } from 'zod';
import { ConflictError, NotFoundError } from '../errors';
import type { UsersRepository } from '../repositories/users.repository';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export function createUsersService(repo: UsersRepository) {
  return {
    listUsers() {
      return repo.findAll();
    },
    getUserById(id: number) {
      const user = repo.findById(id);
      if (!user) throw new NotFoundError(`User ${id} not found`);
      return user;
    },
    createUser(data: unknown) {
      const { email, name } = CreateUserSchema.parse(data);
      if (repo.findByEmail(email)) throw new ConflictError(`Email ${email} already registered`);
      return repo.create(email, name);
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
