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

const withdrawalInclude = {
  requester: { include: { user: { select: { id: true, email: true, name: true } } } },
  votes: {
    include: { member: { include: { user: { select: { id: true, email: true, name: true } } } } },
  },
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

  async addWithdrawal(
    poolId: number,
    memberId: number,
    amountCents: number,
    data: { reason?: string; receiptUrl?: string },
  ) {
    return prisma.withdrawal.create({
      data: {
        poolId,
        requestedBy: memberId,
        amountCents,
        reason: data.reason,
        receiptUrl: data.receiptUrl,
      },
      include: withdrawalInclude,
    });
  },

  async listWithdrawals(poolId: number) {
    return prisma.withdrawal.findMany({
      where: { poolId },
      include: withdrawalInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findWithdrawal(id: number) {
    return prisma.withdrawal.findUnique({
      where: { id },
      include: withdrawalInclude,
    });
  },

  async findVote(withdrawalId: number, memberId: number) {
    return prisma.withdrawalVote.findUnique({
      where: { withdrawalId_memberId: { withdrawalId, memberId } },
    });
  },

  async addVote(withdrawalId: number, memberId: number, vote: 'approve' | 'reject') {
    return prisma.withdrawalVote.create({ data: { withdrawalId, memberId, vote } });
  },

  async countVotes(withdrawalId: number): Promise<{ approve: number; reject: number }> {
    const [approveCount, rejectCount] = await Promise.all([
      prisma.withdrawalVote.count({ where: { withdrawalId, vote: 'approve' } }),
      prisma.withdrawalVote.count({ where: { withdrawalId, vote: 'reject' } }),
    ]);
    return { approve: approveCount, reject: rejectCount };
  },

  async resolveWithdrawal(id: number, status: 'approved' | 'rejected', resolvedAt: Date) {
    return prisma.withdrawal.update({
      where: { id },
      data: { status, resolvedAt },
      include: withdrawalInclude,
    });
  },

  /** Reject all pending withdrawals in a pool (used when dissolving). */
  async rejectPendingWithdrawals(poolId: number) {
    return prisma.withdrawal.updateMany({
      where: { poolId, status: 'pending' },
      data: { status: 'rejected', resolvedAt: new Date() },
    });
  },

  async listContributions(poolId: number) {
    return prisma.poolContribution.findMany({
      where: { poolId },
      include: {
        member: { include: { user: { select: { id: true, email: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  },
};
