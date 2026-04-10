import { prisma } from "../db/client";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors/AppError";
import {
  poolRepository,
  type BalanceResult,
  type CreatePoolInput,
  type PoolDetail,
  type PoolPreview,
} from "./pool.repository";
import type { Pool, PoolContribution } from "../generated/prisma/client";

export type CreatePoolBody = {
  name: string;
  purpose?: string;
  targetAmount: number;
  currency?: string;
};

export type ContributeBody = {
  amountCents: number;
  note?: string;
};

export const poolService = {
  async createPool(organizerId: string, body: CreatePoolBody): Promise<Pool> {
    if (!body.name?.trim()) throw new ValidationError("Pool name is required");
    if (!Number.isInteger(body.targetAmount) || body.targetAmount <= 0) {
      throw new ValidationError("targetAmount must be a positive integer (cents)");
    }
    return poolRepository.create({ ...body, organizerId });
  },

  async getPoolDetail(poolId: string): Promise<PoolDetail> {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError("Pool");
    return pool;
  },

  async inviteMember(poolId: string, requesterId: string, targetUserId: string): Promise<void> {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError("Pool");

    if (pool.organizerId !== requesterId) {
      throw new ForbiddenError("Only the organizer can invite members");
    }

    // Verify the target user exists
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundError("User");

    const existing = await poolRepository.findMembership(poolId, targetUserId);
    if (existing) throw new ConflictError("User is already a member of this pool");

    await poolRepository.addMember(poolId, targetUserId);
  },

  async contribute(
    poolId: string,
    requesterId: string,
    body: ContributeBody,
  ): Promise<PoolContribution> {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError("Pool");

    // Business rule: only OPEN pools accept contributions
    if (pool.status !== "OPEN") {
      throw new ValidationError(`Pool is not accepting contributions (status: ${pool.status})`);
    }

    const membership = await poolRepository.findMembership(poolId, requesterId);
    if (!membership) throw new ForbiddenError("You are not a member of this pool");

    if (!Number.isInteger(body.amountCents) || body.amountCents <= 0) {
      throw new ValidationError("amountCents must be a positive integer");
    }

    // Auto-fund side-effect lives in the repository transaction
    return poolRepository.addContribution(poolId, membership.id, body.amountCents, body.note);
  },

  async getBalance(poolId: string): Promise<BalanceResult> {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError("Pool");
    return poolRepository.getBalance(poolId);
  },

  async getPreview(poolId: string): Promise<PoolPreview> {
    const preview = await poolRepository.getPreview(poolId);
    if (!preview) throw new NotFoundError("Pool");
    return preview;
  },
};
