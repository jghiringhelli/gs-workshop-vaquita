import { z } from 'zod';
import type { CreateUserDto, UserResponse } from './types';
import type { IUserRepository } from '../repositories/user.repository';
import { ConflictError, NotFoundError, ValidationError } from '../errors';

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

function toResponse(user: { id: string; email: string; name: string; createdAt: string }): UserResponse {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
}

/** Handles user registration and lookup. */
export class UserService {
  constructor(private readonly users: IUserRepository) {}

  /**
   * Creates a new user after validating input and checking for duplicate email.
   * @param dto - User creation data.
   * @returns Created user response.
   */
  create(dto: CreateUserDto): UserResponse {
    const parsed = CreateUserSchema.safeParse(dto);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
    }
    if (this.users.findByEmail(dto.email)) {
      throw new ConflictError(`Email '${dto.email}' is already registered`);
    }
    return toResponse(this.users.create(dto));
  }

  /**
   * Returns all users.
   * @returns Array of user response objects.
   */
  findAll(): ReadonlyArray<UserResponse> {
    return this.users.findAll().map(toResponse);
  }

  /**
   * Returns a single user by ID.
   * @param id - User UUID.
   * @returns User response object.
   */
  findById(id: string): UserResponse {
    const user = this.users.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return toResponse(user);
  }
}
