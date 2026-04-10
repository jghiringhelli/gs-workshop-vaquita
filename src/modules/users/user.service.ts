import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { ConflictError, NotFoundError } from '../../errors';
import * as userRepo from './user.repo';
import type { User } from './user.repo';
import type { CreateUserInput } from './user.schemas';

/** Response shape returned when a user is created or authenticated. */
export interface AuthPayload {
  user: User;
  token: string;
}

/**
 * Creates a new user and returns the user record along with a signed JWT.
 *
 * The token payload contains `sub` (userId) and `email`.
 * Throws ConflictError if the email is already registered.
 *
 * @param input - Validated user creation data.
 * @returns Object containing the created user and a signed JWT.
 */
export function createUser(input: CreateUserInput): AuthPayload {
  const existing = userRepo.findUserByEmail(input.email);
  if (existing !== undefined) {
    throw new ConflictError(`Email '${input.email}' is already registered`);
  }

  const user = userRepo.createUser(input);
  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET);
  return { user, token };
}

/**
 * Returns a single user by ID.
 * Throws NotFoundError if the user does not exist.
 *
 * @param id - The user's UUID.
 * @returns The user record.
 */
export function getUserById(id: string): User {
  const user = userRepo.findUserById(id);
  if (user === undefined) {
    throw new NotFoundError(`User '${id}' not found`);
  }
  return user;
}

/**
 * Returns all registered users.
 *
 * @returns Array of user records.
 */
export function listUsers(): User[] {
  return userRepo.findAllUsers();
}
