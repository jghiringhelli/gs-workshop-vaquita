import { prisma } from '../db/client';
import type { PoolStatus } from '../generated/prisma/enums';

const memberSelect = {
  id: true,
  userId: true,
  joinedAt: true,
  user: { select: { id: true, email: true, name: true } },
} as const;

const poolInclude = {
  organizer: { select: { id: true, email: true, name: true } },
  members: { include: { user: { select: { id: true, email: true, name: true } } } },
  contributions: true,
} as const;

export const poolRepository = {
  async create(data: {
    name: string;
    purpose?: string;
    targetAmount: number;
    currency: string;
    organizerId: number;
  }) {
    return prisma.pool.create({
      data: {
        name: data.name,
        purpose: data.purpose,
        targetAmount: data.targetAmount,
        currency: data.currency,
        organizerId: data.organizerId,
        members: { create: [{ userId: data.organizerId }] },
      },
      include: poolInclude,
    });
  },

  async findById(id: number) {
    return prisma.pool.findUnique({ where: { id }, include: poolInclude });
  },

  async findMember(poolId: number, userId: number) {
    return prisma.poolMember.findUnique({
      where: { poolId_userId: { poolId, userId } },
    });
  },

  async addMember(poolId: number, userId: number) {
    return prisma.poolMember.create({
      data: { poolId, userId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  },

  async addContribution(memberId: number, poolId: number, amountCents: number, note?: string) {
    return prisma.poolContribution.create({
      data: { memberId, poolId, amountCents, note },
    });
  },

  async sumContributions(poolId: number): Promise<number> {
    const result = await prisma.poolContribution.aggregate({
      where: { poolId },
      _sum: { amountCents: true },
    });
    return result._sum.amountCents ?? 0;
  },

  async sumApprovedWithdrawals(poolId: number): Promise<number> {
    const result = await prisma.withdrawal.aggregate({
      where: { poolId, status: 'approved' },
      _sum: { amountCents: true },
    });
    return result._sum.amountCents ?? 0;
  },

  async updateStatus(id: number, status: PoolStatus) {
    return prisma.pool.update({ where: { id }, data: { status } });
  },

  async addWithdrawal(poolId: number, memberId: number, amountCents: number, note?: string) {
    return prisma.withdrawal.create({
      data: { poolId, requestedBy: memberId, amountCents, note },
    });
  },

  async findWithdrawal(id: number) {
    return prisma.withdrawal.findUnique({ where: { id } });
  },

  async approveWithdrawal(id: number) {
    return prisma.withdrawal.update({ where: { id }, data: { status: 'approved' } });
  },
};
