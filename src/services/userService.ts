import { UserRepository } from '../repositories/userRepository';
import { User, CreateUserRequest } from '../models/types';
import { ValidationError, NotFoundError } from '../errors/customErrors';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  createUser(request: CreateUserRequest): User {
    const { email, name } = request;

    if (!email || !name) {
      throw new ValidationError('Email and name are required');
    }

    const existingUser = this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ValidationError(`User with email ${email} already exists`);
    }

    return this.userRepository.create(email, name);
  }

  getUserById(id: number): User {
    const user = this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User with id ${id} not found`);
    }
    return user;
  }

  listUsers(): User[] {
    return this.userRepository.findAll();
  }

  getUserByEmail(email: string): User | null {
    return this.userRepository.findByEmail(email);
  }
}
