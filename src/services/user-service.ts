import { ConflictError, NotFoundError } from "../errors/app-error";
import type { User } from "../domain/models";
import { UserRepository } from "../repositories/user-repository";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  createUser(input: Pick<User, "email" | "name">): User {
    const existing = this.userRepository.findByEmail(input.email);

    if (existing) {
      throw new ConflictError("A user with this email already exists");
    }

    return this.userRepository.create(input);
  }

  listUsers(): User[] {
    return this.userRepository.list();
  }

  getUserById(id: number): User {
    const user = this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }
}
