import { NotFoundError } from "../../errors/app-error";

import { UserRecord, UsersRepository } from "./users.repository";

type CreateUserInput = {
  email: string;
  name: string;
};

export class UsersService {
  public constructor(private readonly usersRepository: UsersRepository) {}

  public createUser(input: CreateUserInput): UserRecord {
    return this.usersRepository.create(input);
  }

  public listUsers(): UserRecord[] {
    return this.usersRepository.findAll();
  }

  public getUserById(id: number): UserRecord {
    const user = this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundError(`User ${id} was not found.`);
    }

    return user;
  }
}

export const usersService = new UsersService(new UsersRepository());