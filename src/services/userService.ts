import { SqliteError } from "better-sqlite3";
import { ConflictError, NotFoundError } from "../errors";
import { UserRepository } from "../repositories/userRepository";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  createUser(input: { email: string; name: string }) {
    try {
      return this.userRepository.create({
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
      });
    } catch (error) {
      if (error instanceof SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new ConflictError("A user with that email already exists.");
      }

      throw error;
    }
  }

  listUsers() {
    return this.userRepository.list();
  }

  getUserById(id: number) {
    const user = this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError("User not found.");
    }

    return user;
  }
}
