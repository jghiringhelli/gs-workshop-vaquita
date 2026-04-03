import jwt from 'jsonwebtoken';
import { config } from '../../shared/config';
import { ConflictError, NotFoundError } from '../../shared/exceptions';
import { UsersRepository, UserRow } from './users.repository';
import { CreateUserDto } from './users.schema';

export interface UserWithToken extends UserRow {
  token: string;
}

/**
 * Generates a JWT for a user.
 */
const issueToken = (user: UserRow): string =>
  jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });

/**
 * Service layer for user operations.
 */
export const createUsersService = (repo: UsersRepository) => ({
  /** Create a user and return it with a JWT. Rejects duplicate emails. */
  create(dto: CreateUserDto): UserWithToken {
    const existing = repo.findByEmail(dto.email);
    if (existing) throw new ConflictError(`Email '${dto.email}' is already registered`);
    const user = repo.insert(dto);
    return { ...user, token: issueToken(user) };
  },

  /** Return all users. */
  listAll(): UserRow[] {
    return repo.findAll();
  },

  /** Return a user by id or throw NotFoundError. */
  getById(id: string): UserRow {
    const user = repo.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  },
});

export type UsersService = ReturnType<typeof createUsersService>;
