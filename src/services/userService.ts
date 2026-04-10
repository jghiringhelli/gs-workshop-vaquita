import { userRepository, User } from '../repositories/userRepository';
import { ConflictError, NotFoundError, ValidationError } from '../errors';

export const userService = {
  createUser(email: string, name: string): User {
    if (!email || !name) throw new ValidationError('email and name are required');
    if (userRepository.findByEmail(email)) throw new ConflictError('Email already in use');
    return userRepository.create(email, name);
  },

  listUsers(): User[] {
    return userRepository.findAll();
  },

  getUserById(id: string): User {
    const user = userRepository.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  },
};
