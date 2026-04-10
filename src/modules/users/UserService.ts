import { User, CreateUserDto } from './User';
import { IUserRepository } from './IUserRepository';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError';

export class UserService {
  constructor(private readonly userRepo: IUserRepository) {}

  createUser(dto: CreateUserDto): User {
    if (!dto.email || !dto.name) throw new ValidationError('email and name are required');
    const existing = this.userRepo.findByEmail(dto.email);
    if (existing) throw new ConflictError(`Email ${dto.email} already in use`);
    return this.userRepo.create(dto);
  }

  getUserById(id: string): User {
    const user = this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  }

  listUsers(): User[] {
    return this.userRepo.findAll();
  }
}
