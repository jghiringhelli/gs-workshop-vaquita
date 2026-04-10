import { z } from 'zod';
import * as userRepo from '../repositories/userRepository';
import { ConflictError, NotFoundError } from '../errors';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export function createUser(input: CreateUserInput) {
  const existing = userRepo.getUserByEmail(input.email);
  if (existing) throw new ConflictError('Email already in use');
  return userRepo.createUser(input.email, input.name);
}

export function listUsers() {
  return userRepo.listUsers();
}

export function getUserById(id: number) {
  const user = userRepo.getUserById(id);
  if (!user) throw new NotFoundError('User not found');
  return user;
}
