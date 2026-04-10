import type { UsersRepo } from '../repositories/usersRepo';
import type { CreateUserInput } from '../validation/users';
import { ConflictError, NotFoundError } from '../errors';

export function createUsersService(repo: UsersRepo) {
  return {
    listUsers() {
      return repo.findAll();
    },

    getUserById(id: string) {
      const user = repo.findById(id);
      if (!user) throw new NotFoundError('User', id);
      return user;
    },

    getUserByEmail(email: string) {
      return repo.findByEmail(email);
    },

    createUser(data: CreateUserInput) {
      const existing = repo.findByEmail(data.email);
      if (existing) throw new ConflictError(`A user with email '${data.email}' already exists`);
      return repo.create(data);
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
