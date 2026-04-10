import * as userRepo from '../repositories/user.repository';
import { signToken } from '../utils/jwt';
import { NotFoundError, ConflictError } from '../errors/errors';

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  token: string;
}

export function createUser(email: string, name: string): UserResponse {
  const existing = userRepo.findUserByEmail(email);
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  const user = userRepo.createUser(email, name);
  const token = signToken(user.id);

  return { id: user.id, email: user.email, name: user.name, token };
}

export function getUserById(id: number): { id: number; email: string; name: string } {
  const user = userRepo.findUserById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return { id: user.id, email: user.email, name: user.name };
}

export function listUsers(): { id: number; email: string; name: string }[] {
  return userRepo.findAllUsers();
}
