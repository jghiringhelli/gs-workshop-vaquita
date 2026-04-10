import { ConflictError, NotFoundError } from "../errors/app-error";
import { UsersRepository } from "../repositories/users.repository";
import type { CreateUserInput, User } from "./user.types";

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  createUser(input: CreateUserInput): User {
    const existing = this.usersRepository.findByEmail(input.email);

    if (existing) {
      throw new ConflictError(`A user with email ${input.email} already exists`);
    }

    return this.usersRepository.create(input);
  }

  listUsers(): User[] {
    return this.usersRepository.list();
  }

  getUserById(id: number): User {
    const user = this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundError(`User ${id} was not found`);
    }

    return user;
  }
}
