import * as userRepo from '../repositories/user.repo';
import { ConflictError, NotFoundError } from '../errors';
import type { User } from '../types';

/**
 * Creates a new user, rejecting duplicate emails.
 * @param email - Unique email address
 * @param name - Display name
 * @returns Created User
 */
export function createUser(email: string, name: string): User {
  if (userRepo.findUserByEmail(email)) {
    throw new ConflictError(`Email already in use: ${email}`);
  }
  return userRepo.createUser(email, name);
}

/**
 * Returns a user by ID, throwing 404 if not found.
 * @param id - User UUID
 * @returns User
 */
export function getUser(id: string): User {
  const user = userRepo.findUserById(id);
  if (!user) throw new NotFoundError('User', id);
  return user;
}

/**
 * Returns all users.
 * @returns Array of User
 */
export function listUsers(): User[] {
  return userRepo.findAllUsers();
}
