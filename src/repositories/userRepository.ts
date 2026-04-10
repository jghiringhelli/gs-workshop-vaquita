import { prisma } from '../db/client';
import { type Prisma } from '../generated/prisma/client';

export type CreateUserInput = {
  email: string;
  name: string;
  passwordHash?: string;
};

export const userRepository = {
  async findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async findAll() {
    return prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  },

  async create(data: CreateUserInput) {
    return prisma.user.create({ data });
  },
};
