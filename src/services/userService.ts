import * as userRepo from '../repositories/userRepository';
import { NotFoundError, ConflictError } from '../errors/AppError';
import { User } from '../types';

export function createUser(data: { email: string; name: string }): User {
  const existing = userRepo.findByEmail(data.email);
  if (existing) {
    throw new ConflictError(`User with email '${data.email}' already exists`);
  }
  return userRepo.create(data);
}

export function getUserById(id: number): User {
  const user = userRepo.findById(id);
  if (!user) {
    throw new NotFoundError(`User with id ${id} not found`);
  }
  return user;
}

export function listUsers(): User[] {
  return userRepo.findAll();
}
