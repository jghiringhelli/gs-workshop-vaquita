/**
 * User repository — all database interactions for users.
 * Route handlers never call Prisma directly; they go through services → repositories.
 */
import type { User } from "@prisma/client";
import prisma from "../db";

export const userRepository = {
  async create(data: { email: string; name: string }): Promise<User> {
    return prisma.user.create({ data });
  },

  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async findAll(): Promise<User[]> {
    return prisma.user.findMany();
  },
};

