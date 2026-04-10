import { UserRepository, User } from '../repositories/user';
import { CreateUserInput } from '../schemas';
import { ValidationError } from '../errors';

export class UserService {
  constructor(private userRepo: UserRepository) {}

  create(input: CreateUserInput): User {
    try {
      return this.userRepo.create(input.email, input.name);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to create user');
    }
  }

  getById(id: string): User {
    return this.userRepo.getById(id);
  }

  getByEmail(email: string): User {
    return this.userRepo.getByEmail(email);
  }

  list(): User[] {
    return this.userRepo.list();
  }
}
