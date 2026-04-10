import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors/AppError";
import { poolRepository } from "./pool.repository";
import { withdrawalRepository, type LedgerEntry, type WithdrawalWithVotes } from "./withdrawal.repository";
import type { Pool, PoolWithdrawal } from "../generated/prisma/client";

export type RequestWithdrawalBody = {
  amountCents: number;
  reason: string;
  receiptUrl?: string;
};

export const withdrawalService = {
  /** Only the pool organiser may request a withdrawal. */
  async requestWithdrawal(
    poolId: string,
    requesterId: string,
    body: RequestWithdrawalBody,
  ): Promise<PoolWithdrawal> {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError("Pool");

    if (pool.organizerId !== requesterId) {
      throw new ForbiddenError("Only the organizer can request a withdrawal");
    }
    if (!Number.isInteger(body.amountCents) || body.amountCents <= 0) {
      throw new ValidationError("amountCents must be a positive integer");
    }
    if (!body.reason?.trim()) {
      throw new ValidationError("reason is required");
    }

    return withdrawalRepository.create({
      poolId,
      requestedByUserId: requesterId,
      amountCents: body.amountCents,
      reason: body.reason.trim(),
      receiptUrl: body.receiptUrl,
    });
  },

  async listWithdrawals(poolId: string): Promise<WithdrawalWithVotes[]> {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError("Pool");
    return withdrawalRepository.list(poolId);
  },

  /**
   * Cast a vote on a withdrawal.
   *
   * Business rules enforced here:
   * 1. receiptUrl must be present before any vote can be cast
   * 2. A member cannot vote on their own withdrawal
   * 3. Withdrawal must still be PENDING
   * 4. Voter must be a pool member
   * 5. No duplicate votes (DB unique constraint + service guard)
   */
  async vote(
    withdrawalId: string,
    voterId: string,   // authenticated User.id
    voteValue: "APPROVE" | "REJECT",
  ): Promise<void> {
    const withdrawal = await withdrawalRepository.findById(withdrawalId);
    if (!withdrawal) throw new NotFoundError("Withdrawal");

    // Rule 1: receiptUrl required before voting
    if (!withdrawal.receiptUrl) {
      throw new ValidationError("A receipt URL must be uploaded before votes can be cast");
    }

    // Rule 3: only PENDING withdrawals can be voted on
    if (withdrawal.status !== "PENDING") {
      throw new ValidationError(`Withdrawal is already ${withdrawal.status.toLowerCase()}`);
    }

    // Verify voter is a member of this pool
    const membership = await poolRepository.findMembership(withdrawal.poolId, voterId);
    if (!membership) throw new ForbiddenError("You are not a member of this pool");

    // Rule 2: organiser (requester) cannot vote on their own withdrawal
    if (withdrawal.requestedByUserId === voterId) {
      throw new ForbiddenError("You cannot vote on your own withdrawal request");
    }

    // Rule 5: duplicate vote guard (DB constraint also protects this)
    const alreadyVoted = withdrawal.votes.some((v) => v.voterId === membership.id);
    if (alreadyVoted) throw new ConflictError("You have already voted on this withdrawal");

    // Fetch member count for threshold calculation
    const pool = await poolRepository.findById(withdrawal.poolId);
    const memberCount = pool!.members.length;

    await withdrawalRepository.castVote(withdrawalId, membership.id, voteValue, memberCount);
  },

  async getLedger(poolId: string): Promise<LedgerEntry[]> {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError("Pool");
    return withdrawalRepository.getLedger(poolId);
  },

  /** Organiser dissolves the pool — sets status to CLOSED. */
  async dissolve(poolId: string, requesterId: string): Promise<Pool> {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError("Pool");

    if (pool.organizerId !== requesterId) {
      throw new ForbiddenError("Only the organizer can dissolve the pool");
    }
    if (pool.status === "CLOSED") {
      throw new ValidationError("Pool is already closed");
    }

    const { prisma } = await import("../db/client");
    return prisma.pool.update({ where: { id: poolId }, data: { status: "CLOSED" } });
  },
};
