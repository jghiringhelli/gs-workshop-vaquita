import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { userRepository } from '../repositories/userRepository';
import { ConflictError, NotFoundError, UnauthorizedError } from '../errors/AppError';

const BCRYPT_ROUNDS = 10;

function stripHash<T extends { passwordHash?: string | null }>(
  user: T,
): Omit<T, 'passwordHash'> {
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

export const userService = {
  async register(email: string, name: string, password: string) {
    const existing = await userRepository.findByEmail(email);
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await userRepository.create({ email, name, passwordHash });
    return stripHash(user);
  },

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user?.passwordHash) throw new UnauthorizedError('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '7d' },
    );
    return { token, user: stripHash(user) };
  },

  async getById(id: number) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return stripHash(user);
  },

  async getAll() {
    const users = await userRepository.findAll();
    return users.map(stripHash);
  },
};
