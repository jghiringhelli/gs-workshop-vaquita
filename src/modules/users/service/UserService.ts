import { z } from 'zod';
import { IUserRepository } from '../ports/IUserRepository';
import { User } from '../domain/User';
import { ConflictError, NotFoundError } from '../../../shared/exceptions/AppError';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

/** Service containing all user business logic. */
export class UserService {
  constructor(private readonly userRepo: IUserRepository) {}

  /**
   * Creates a new user after validating input and checking email uniqueness.
   * @param raw - Unvalidated request body.
   * @returns The created user.
   */
  createUser(raw: unknown): User {
    const input = CreateUserSchema.parse(raw);
    if (this.userRepo.findByEmail(input.email)) {
      throw new ConflictError(`Email ${input.email} is already registered`);
    }
    return this.userRepo.create(input);
  }

  /**
   * Retrieves a user by ID.
   * @param id - User UUID.
   * @returns The user.
   */
  getUserById(id: string): User {
    const user = this.userRepo.findById(id);
    if (!user) throw new NotFoundError(`User ${id} not found`);
    return user;
  }
}
