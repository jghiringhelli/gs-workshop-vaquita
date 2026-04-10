import { prisma } from "../db/client";
import type { Pool, PoolMember, PoolContribution, PoolStatus } from "../generated/prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────

export type CreatePoolInput = {
  name: string;
  purpose?: string;
  targetAmount: number; // cents
  currency?: string;
  organizerId: string;
};

export type PoolDetail = Pool & {
  members: (PoolMember & { user: { id: string; email: string; username: string } })[];
  totalContributions: number;
  contributionCount: number;
};

export type BalanceResult = {
  totalContributions: number;
  approvedWithdrawals: number;
  balance: number;
  currency: string;
};

export type PoolPreview = {
  id: string;
  name: string;
  purpose: string | null;
  targetAmount: number;
  currency: string;
  status: PoolStatus;
  totalContributions: number;
  percentFunded: number;
  memberCount: number;
};

// ── Repository ────────────────────────────────────────────────────────────

export const poolRepository = {
  /** Create a pool and atomically add the organizer as the first member. */
  async create(input: CreatePoolInput): Promise<Pool> {
    return prisma.$transaction(async (tx) => {
      const pool = await tx.pool.create({
        data: {
          name: input.name,
          purpose: input.purpose,
          targetAmount: input.targetAmount,
          currency: input.currency ?? "MXN",
          organizerId: input.organizerId,
        },
      });
      await tx.poolMember.create({
        data: { poolId: pool.id, userId: input.organizerId },
      });
      return pool;
    });
  },

  async findById(id: string): Promise<PoolDetail | null> {
    const pool = await prisma.pool.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, username: true } } },
        },
        contributions: { select: { amountCents: true } },
      },
    });
    if (!pool) return null;

    const totalContributions = pool.contributions.reduce((s, c) => s + c.amountCents, 0);
    // Strip the raw contributions array before returning enriched result
    const { contributions: _, ...poolData } = pool;
    return { ...poolData, totalContributions, contributionCount: pool.contributions.length };
  },

  async findMembership(poolId: string, userId: string): Promise<PoolMember | null> {
    return prisma.poolMember.findUnique({ where: { poolId_userId: { poolId, userId } } });
  },

  async addMember(poolId: string, userId: string): Promise<PoolMember> {
    return prisma.poolMember.create({ data: { poolId, userId } });
  },

  /**
   * Record a contribution and — within the same transaction — auto-fund the
   * pool if totalContributions >= targetAmount.
   */
  async addContribution(
    poolId: string,
    memberId: string,
    amountCents: number,
    note?: string,
  ): Promise<PoolContribution> {
    return prisma.$transaction(async (tx) => {
      const contribution = await tx.poolContribution.create({
        data: { poolId, memberId, amountCents, note },
      });

      // Sum all contributions in this pool (including the one just inserted)
      const all = await tx.poolContribution.findMany({
        where: { poolId },
        select: { amountCents: true },
      });
      const total = all.reduce((s, c) => s + c.amountCents, 0);

      const pool = await tx.pool.findUnique({
        where: { id: poolId },
        select: { targetAmount: true },
      });

      if (pool && total >= pool.targetAmount) {
        await tx.pool.update({ where: { id: poolId }, data: { status: "FUNDED" } });
      }

      return contribution;
    });
  },

  async getBalance(poolId: string): Promise<BalanceResult> {
    const pool = await prisma.pool.findUnique({
      where: { id: poolId },
      select: { currency: true, contributions: { select: { amountCents: true } } },
    });
    if (!pool) return { totalContributions: 0, approvedWithdrawals: 0, balance: 0, currency: "MXN" };

    const totalContributions = pool.contributions.reduce((s, c) => s + c.amountCents, 0);
    const approvedWithdrawals = 0; // withdrawals not yet implemented
    return {
      totalContributions,
      approvedWithdrawals,
      balance: totalContributions - approvedWithdrawals,
      currency: pool.currency,
    };
  },

  async getPreview(id: string): Promise<PoolPreview | null> {
    const pool = await prisma.pool.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true } },
        contributions: { select: { amountCents: true } },
      },
    });
    if (!pool) return null;

    const totalContributions = pool.contributions.reduce((s, c) => s + c.amountCents, 0);
    const percentFunded =
      pool.targetAmount > 0 ? Math.min(100, Math.round((totalContributions / pool.targetAmount) * 100)) : 0;

    return {
      id: pool.id,
      name: pool.name,
      purpose: pool.purpose,
      targetAmount: pool.targetAmount,
      currency: pool.currency,
      status: pool.status,
      totalContributions,
      percentFunded,
      memberCount: pool._count.members,
    };
  },
};
