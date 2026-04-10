/**
 * Auth service — user registration and login.
 * Passwords are hashed with bcrypt; JWT secret comes from env only.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { config } from "../config";
import { userRepository } from "../repositories/user.repository";
import { ConflictError, UnauthorizedError } from "../errors";

const BCRYPT_ROUNDS = 10;

export type SafeUser = Omit<User, "password">;

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const authService = {
  async register(data: { email: string; username: string; password: string }): Promise<SafeUser> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError(`Email ${data.email} is already registered`);
    }

    const hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const user = await userRepository.create({
      email: data.email,
      name: data.username,
      password: hash,
    });

    return toSafeUser(user);
  },

  async login(data: { email: string; password: string }): Promise<{ token: string }> {
    const user = await userRepository.findByEmail(data.email);

    // Use generic message to avoid leaking whether the email exists
    if (!user || !user.password) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    return { token };
  },
};
