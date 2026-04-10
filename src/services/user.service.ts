import { v4 as uuidv4 } from 'uuid';
import { User, CreateUserRequest } from '../models/user';
import { UserRepository } from '../repositories/user.repository';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  createUser(request: CreateUserRequest): User {
    // Check if email already exists
    const existingUser = this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const user: User = {
      id: uuidv4(),
      email: request.email,
      name: request.name,
      createdAt: new Date(),
    };

    return this.userRepository.create(user);
  }

  getUserById(id: string): User | null {
    return this.userRepository.findById(id);
  }

  getAllUsers(): User[] {
    return this.userRepository.findAll();
  }
}
