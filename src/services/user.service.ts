import bcrypt from 'bcryptjs';
import { ConflictError, UnauthorizedError } from '../errors';
import { signToken } from '../lib/jwt';
import * as userRepo from '../repositories/user.repository';
import type { SafeUser } from '../repositories/user.repository';

const SALT_ROUNDS = 10;

export async function register(
  email: string,
  username: string,
  password: string,
): Promise<SafeUser> {
  const existing = userRepo.findByEmail(email);
  if (existing) {
    throw new ConflictError(`Email ${email} is already registered`);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return userRepo.create(email, username, passwordHash);
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: SafeUser }> {
  const row = userRepo.findByEmail(email);
  if (!row) {
    // Use the same error as wrong-password to avoid user enumeration
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, row.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = signToken({ userId: row.id, email: row.email });
  const { passwordHash: _, ...user } = row;
  return { token, user };
}
