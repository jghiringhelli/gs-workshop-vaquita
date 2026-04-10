import { prisma } from "../db/client";
import type { User } from "../generated/prisma/client";

export type CreateUserInput = {
  email: string;
  username: string;
  passwordHash: string;
};

export type SafeUser = Omit<User, "passwordHash">;

function omitPasswordHash(user: User): SafeUser {
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { username } });
  },

  async findById(id: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? omitPasswordHash(user) : null;
  },

  async create(input: CreateUserInput): Promise<SafeUser> {
    const user = await prisma.user.create({ data: input });
    return omitPasswordHash(user);
  },

  // Used internally by login — returns the hash for comparison.
  async findByEmailWithHash(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },
};
