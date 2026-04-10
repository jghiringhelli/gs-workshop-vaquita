import { ConflictError, NotFoundError } from "../errors/app-error";
import type { User } from "../domain/models";
import type { UserRepository } from "../repositories/user-repository";

export interface CreateUserInput {
  email: string;
  name: string;
}

/**
 * Service for user operations.
 */
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Creates a new user, enforcing unique email.
   * @param input - email and name
   * @returns created User
   */
  createUser(input: CreateUserInput): User {
    const existing = this.userRepository.findByEmail(input.email);
    if (existing) throw new ConflictError("Email already in use");
    return this.userRepository.create(input.email, input.name);
  }

  /**
   * Returns all users.
   * @returns User[]
   */
  listUsers(): User[] {
    return this.userRepository.findAll();
  }

  /**
   * Returns a user by id, throwing 404 if not found.
   * @param id - user id
   * @returns User
   */
  getUserById(id: number): User {
    const user = this.userRepository.findById(id);
    if (!user) throw new NotFoundError(`User ${id} not found`);
    return user;
  }
}
