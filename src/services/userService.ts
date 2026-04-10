import Database from 'better-sqlite3';
import { z } from 'zod';
import * as userRepo from '../repositories/userRepository';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';

const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
});

export function createUser(data: unknown, db?: Database.Database) {
  const parsed = CreateUserSchema.safeParse(data);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
  }
  const existing = userRepo.findUserByEmail(parsed.data.email, db);
  if (existing) {
    throw new ConflictError(`User with email ${parsed.data.email} already exists`);
  }
  return userRepo.createUser(parsed.data, db);
}

export function listUsers(db?: Database.Database) {
  return userRepo.findAllUsers(db);
}

export function getUserById(id: string | number, db?: Database.Database) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new NotFoundError(`User ${id} not found`);
  }
  const user = userRepo.findUserById(numericId, db);
  if (!user) throw new NotFoundError(`User ${id} not found`);
  return user;
}
