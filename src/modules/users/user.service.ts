import { z } from 'zod';
import * as userRepo from './user.repository';
import { ConflictError, NotFoundError } from '../../errors/AppError';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export function createUser(input: CreateUserInput) {
  const existing = userRepo.findUserByEmail(input.email);
  if (existing) throw new ConflictError(`User with email '${input.email}' already exists`);
  return userRepo.createUser(input.email, input.name);
}

export function getUserById(id: string) {
  const user = userRepo.findUserById(id);
  if (!user) throw new NotFoundError('User', id);
  return user;
}

export function listUsers() {
  return userRepo.listUsers();
}
