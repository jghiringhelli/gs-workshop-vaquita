import { IUserRepository } from './user.repository.interface';
import { CreateUserDTO, UserResponseDTO } from './user.types';
import { toUserResponseDTO } from './user.mapper';
import { NotFoundError, ConflictError } from '../errors/AppError';

/**
 * Business logic for user management.
 * Depends on IUserRepository — concrete implementation injected at construction.
 */
export class UserService {
  /**
   * @param userRepository - Persistence port for users
   */
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Creates a new user after verifying email uniqueness.
   * @param dto - Validated creation data
   * @throws ConflictError if the email is already registered
   * @returns The created user as a response DTO
   */
  createUser(dto: CreateUserDTO): UserResponseDTO {
    const existing = this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError(`A user with email '${dto.email}' already exists`);
    }
    const user = this.userRepository.create(dto);
    return toUserResponseDTO(user);
  }

  /**
   * Retrieves a single user by ID.
   * @param id - User UUID
   * @throws NotFoundError if no user with that ID exists
   * @returns The user as a response DTO
   */
  getUserById(id: string): UserResponseDTO {
    const user = this.userRepository.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return toUserResponseDTO(user);
  }

  /**
   * Returns all users.
   * @returns Array of user response DTOs
   */
  listUsers(): UserResponseDTO[] {
    return this.userRepository.findAll().map(toUserResponseDTO);
  }
}
