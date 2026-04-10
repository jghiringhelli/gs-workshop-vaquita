import { userRepository } from '../repositories/userRepository';
import { User } from '../types';
import { BadRequestError, ConflictError, NotFoundError } from '../errors';

export const userService = {
  createUser(email: string, name: string): User {
    const existing = userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }
    return userRepository.create(email, name);
  },

  getUserById(id: number): User {
    const user = userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User with id ${id} not found`);
    }
    return user;
  },

  listUsers(): User[] {
    return userRepository.findAll();
  },
};
