import * as usersRepo from '../repositories/users.repository';
import { User } from '../types';
import { NotFoundError, ValidationError, ConflictError } from '../errors';

export function createUser(email: string, name: string): User {
  if (!email || !name) {
    throw new ValidationError('Email and name are required');
  }

  const existing = usersRepo.findUserByEmail(email);
  if (existing) {
    throw new ConflictError('Email already exists');
  }

  return usersRepo.createUser(email, name);
}

export function getAllUsers(): User[] {
  return usersRepo.findAllUsers();
}

export function getUserById(id: number): User {
  const user = usersRepo.findUserById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
}
