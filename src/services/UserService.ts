import { v4 as uuidv4 } from 'uuid';
import { User } from '../models';
import { IUserRepository } from '../repositories/interfaces';
import { ConflictError, NotFoundError } from '../errors';

export interface CreateUserInput {
  email: string;
  name: string;
}

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  createUser(input: CreateUserInput): User {
    const existing = this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`User with email '${input.email}' already exists`);
    }
    return this.userRepository.create({
      id: uuidv4(),
      email: input.email,
      name: input.name,
    });
  }

  getUser(id: string): User {
    const user = this.userRepository.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  }

  listUsers(): User[] {
    return this.userRepository.findAll();
  }
}
