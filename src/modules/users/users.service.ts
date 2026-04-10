import {
  createUser,
  findUserById,
  findUserByEmail,
  listUsers,
  User,
} from './users.repository';
import { ConflictError, NotFoundError } from '../../shared/exceptions';

/**
 * Creates a new user after validating the email is not already in use.
 *
 * @param email - Desired email address.
 * @param name - Display name.
 * @returns The created User.
 */
export function createUserService(email: string, name: string): User {
  const existing = findUserByEmail(email);
  if (existing) throw new ConflictError('Email already in use');
  return createUser(email, name);
}

/**
 * Retrieves a user by ID or throws NotFoundError.
 *
 * @param id - UUID of the user.
 * @returns The User entity.
 */
export function getUserById(id: string): User {
  const user = findUserById(id);
  if (!user) throw new NotFoundError(`User ${id} not found`);
  return user;
}

/**
 * Returns all users in the system.
 *
 * @returns Array of User entities.
 */
export function listAllUsers(): User[] {
  return listUsers();
}
