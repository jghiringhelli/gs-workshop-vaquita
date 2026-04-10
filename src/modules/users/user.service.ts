import { User } from './user.entity.js';
import { IUserRepository } from './user.port.js';
import { CreateUserDto } from './user.schema.js';
import { ConflictError, NotFoundError } from '../../shared/exceptions/index.js';

/**
 * Service for user lifecycle operations.
 * All persistence is delegated to IUserRepository.
 */
export class UserService {
  /** @param repo - User repository port */
  constructor(private readonly repo: IUserRepository) {}

  /**
   * Creates a new user, rejecting duplicate emails.
   * @param dto - Validated user creation payload
   * @returns The newly created User
   * @throws ConflictError if email is already registered
   */
  create(dto: CreateUserDto): User {
    const existing = this.repo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError(`Email '${dto.email}' is already registered`);
    }
    return this.repo.create(dto);
  }

  /**
   * Returns all users.
   * @returns Array of User records
   */
  findAll(): User[] {
    return this.repo.findAll();
  }

  /**
   * Returns a single user by id.
   * @param id - UUID of the user
   * @returns The User
   * @throws NotFoundError if no user with that id exists
   */
  findById(id: string): User {
    const user = this.repo.findById(id);
    if (!user) throw new NotFoundError(`User '${id}' not found`);
    return user;
  }
}

