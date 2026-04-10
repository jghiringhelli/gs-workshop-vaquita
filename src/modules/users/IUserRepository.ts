import { User, CreateUserDto } from './User';

export interface IUserRepository {
  create(dto: CreateUserDto): User;
  findById(id: string): User | null;
  findAll(): User[];
  findByEmail(email: string): User | null;
}
