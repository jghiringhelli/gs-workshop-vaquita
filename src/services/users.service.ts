import { z } from 'zod';
import * as usersRepo from '../repositories/users.repository';
import { ConflictError, NotFoundError } from '../errors';
import type { User } from '../types';

const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
});

export function createUser(data: unknown): User {
  const { email, name } = CreateUserSchema.parse(data);
  const existing = usersRepo.findUserByEmail(email);
  if (existing) throw new ConflictError(`Email ${email} is already registered`);
  return usersRepo.createUser(email, name);
}

export function listUsers(): User[] {
  return usersRepo.listUsers();
}

export function getUserById(id: number): User {
  const user = usersRepo.findUserById(id);
  if (!user) throw new NotFoundError(`User ${id} not found`);
  return user;
}
