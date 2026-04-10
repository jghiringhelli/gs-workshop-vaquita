import { User, CreateUserDTO } from './user.types';

/**
 * Port interface for user persistence.
 * Defined in the domain layer; implemented by the SQLite adapter.
 * Services depend on this interface — never on the concrete class.
 */
export interface IUserRepository {
  /**
   * Persists a new user and returns the created domain entity.
   * @param dto - Validated user creation data
   */
  create(dto: CreateUserDTO): User;

  /**
   * Retrieves a user by primary key.
   * @param id - User UUID
   * @returns The User, or null if not found
   */
  findById(id: string): User | null;

  /**
   * Retrieves a user by email address (used for uniqueness checks).
   * @param email - Email to search for
   * @returns The User, or null if not found
   */
  findByEmail(email: string): User | null;

  /**
   * Returns all users ordered by creation date descending.
   */
  findAll(): User[];
}
