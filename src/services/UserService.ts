import { signToken } from '../jwt';
import type { UserRepository } from '../repositories/UserRepository';
import type { CreateUserDto } from '../validators/user.validator';
import type { User } from '../models';
import { ConflictError, NotFoundError } from '../errors/AppError';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  createUser(dto: CreateUserDto): { user: User; token: string } {
    const existing = this.userRepository.findByEmail(dto.email);
    if (existing) throw new ConflictError(`Email '${dto.email}' is already registered`);

    const user = this.userRepository.create(dto);
    const token = signToken({ userId: user.id });
    return { user, token };
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
