/**
 * Pool repository — all database interactions for pools, members, contributions, and withdrawals.
 * Route handlers never call Prisma directly; they go through services → repositories.
 */
import type { Pool, PoolMember, PoolContribution, PoolWithdrawal, User } from "@prisma/client";
import prisma from "../db";

export type PoolWithDetails = Pool & {
  organizer: User;
  members: (PoolMember & { user: User })[];
  contributions: (PoolContribution & { member: PoolMember & { user: User } })[];
  withdrawals: PoolWithdrawal[];
};

export const poolRepository = {
  async create(data: {
    name: string;
    purpose?: string | null;
    targetAmount: number;
    currency?: string;
    organizerId: number;
  }): Promise<Pool> {
    return prisma.pool.create({ data });
  },

  async findById(id: number): Promise<PoolWithDetails | null> {
    return prisma.pool.findUnique({
      where: { id },
      include: {
        organizer: true,
        members: { include: { user: true } },
        contributions: { include: { member: { include: { user: true } } } },
        withdrawals: true,
      },
    });
  },

  async update(id: number, data: { status?: string }): Promise<Pool> {
    return prisma.pool.update({ where: { id }, data });
  },

  async addMember(data: { poolId: number; userId: number }): Promise<PoolMember> {
    return prisma.poolMember.create({ data });
  },

  async findMember(poolId: number, userId: number): Promise<PoolMember | null> {
    return prisma.poolMember.findUnique({
      where: { poolId_userId: { poolId, userId } },
    });
  },

  async createContribution(data: {
    poolId: number;
    memberId: number;
    amountCents: number;
    note?: string | null;
  }): Promise<PoolContribution> {
    return prisma.poolContribution.create({ data });
  },

  async getTotalContributions(poolId: number): Promise<number> {
    const result = await prisma.poolContribution.aggregate({
      where: { poolId },
      _sum: { amountCents: true },
    });
    return result._sum.amountCents ?? 0;
  },

  async getTotalApprovedWithdrawals(poolId: number): Promise<number> {
    const result = await prisma.poolWithdrawal.aggregate({
      where: { poolId, status: "approved" },
      _sum: { amountCents: true },
    });
    return result._sum.amountCents ?? 0;
  },
};
