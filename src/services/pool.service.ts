/**
 * Pool service — business logic for savings pools.
 *
 * Business rules enforced:
 *  - Only "open" pools accept contributions
 *  - When totalContributions >= targetAmount, pool status becomes "funded" automatically
 *  - Only the pool organizer can invite members
 *  - Only pool members can contribute
 */
import type { PoolContribution, PoolMember } from "@prisma/client";
import { poolRepository, type PoolWithDetails } from "../repositories/pool.repository";
import { userRepository } from "../repositories/user.repository";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors";

export type PoolPreview = {
  id: number;
  name: string;
  purpose: string | null;
  targetAmount: number;
  currency: string;
  status: string;
  totalContributions: number;
  memberCount: number;
  percentFunded: number;
};

export type PoolDetail = PoolWithDetails & { totalContributions: number };

export type BalanceResult = {
  balance: number;
  totalContributions: number;
  totalWithdrawals: number;
  currency: string;
};

export const poolService = {
  async createPool(data: {
    name: string;
    purpose?: string;
    targetAmount: number;
    currency?: string;
    organizerId: number;
  }): Promise<PoolDetail> {
    // Verify the organizer exists
    const organizer = await userRepository.findById(data.organizerId);
    if (!organizer) {
      throw new NotFoundError("User", data.organizerId);
    }

    const pool = await poolRepository.create({
      name: data.name,
      purpose: data.purpose ?? null,
      targetAmount: data.targetAmount,
      currency: data.currency ?? "MXN",
      organizerId: data.organizerId,
    });

    // Auto-enrol organizer as first member
    await poolRepository.addMember({ poolId: pool.id, userId: data.organizerId });

    // Return the full pool with details
    const full = await poolRepository.findById(pool.id) as PoolWithDetails;
    return { ...full, totalContributions: 0 };
  },

  async getPool(id: number): Promise<PoolDetail> {
    const pool = await poolRepository.findById(id);
    if (!pool) throw new NotFoundError("Pool", id);

    const totalContributions = await poolRepository.getTotalContributions(id);
    return { ...pool, totalContributions };
  },

  async inviteMember(
    poolId: number,
    data: { userId: number; requesterId: number }
  ): Promise<PoolMember> {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError("Pool", poolId);

    if (pool.organizerId !== data.requesterId) {
      throw new ForbiddenError("Only the organizer can invite members");
    }

    // Verify the invited user exists
    const user = await userRepository.findById(data.userId);
    if (!user) throw new NotFoundError("User", data.userId);

    const existing = await poolRepository.findMember(poolId, data.userId);
    if (existing) throw new ConflictError("User is already a member of this pool");

    return poolRepository.addMember({ poolId, userId: data.userId });
  },

  async contribute(
    poolId: number,
    data: { userId: number; amountCents: number; note?: string }
  ): Promise<PoolContribution> {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError("Pool", poolId);

    if (pool.status !== "open") {
      throw new BadRequestError(`Pool is not accepting contributions (status: ${pool.status})`);
    }

    const member = await poolRepository.findMember(poolId, data.userId);
    if (!member) throw new ForbiddenError("Only pool members can contribute");

    const contribution = await poolRepository.createContribution({
      poolId,
      memberId: member.id,
      amountCents: data.amountCents,
      note: data.note ?? null,
    });

    // Auto-fund: check if target has been reached
    const total = await poolRepository.getTotalContributions(poolId);
    if (total >= pool.targetAmount) {
      await poolRepository.update(poolId, { status: "funded" });
    }

    return contribution;
  },

  async getBalance(poolId: number): Promise<BalanceResult> {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError("Pool", poolId);

    const [totalContributions, totalWithdrawals] = await Promise.all([
      poolRepository.getTotalContributions(poolId),
      poolRepository.getTotalApprovedWithdrawals(poolId),
    ]);

    return {
      balance: totalContributions - totalWithdrawals,
      totalContributions,
      totalWithdrawals,
      currency: pool.currency,
    };
  },

  async getPreview(poolId: number): Promise<PoolPreview> {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError("Pool", poolId);

    const totalContributions = await poolRepository.getTotalContributions(poolId);
    const percentFunded =
      pool.targetAmount > 0
        ? Math.min(100, Math.round((totalContributions / pool.targetAmount) * 100))
        : 0;

    return {
      id: pool.id,
      name: pool.name,
      purpose: pool.purpose,
      targetAmount: pool.targetAmount,
      currency: pool.currency,
      status: pool.status,
      totalContributions,
      memberCount: pool.members.length,
      percentFunded,
    };
  },
};
