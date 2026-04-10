import { prisma } from "../db/client";
import type { PoolWithdrawal, WithdrawalVote, VoteValue } from "../generated/prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────

export type WithdrawalWithVotes = PoolWithdrawal & {
  votes: WithdrawalVote[];
  approveCount: number;
  rejectCount: number;
};

export type LedgerEntry =
  | { type: "contribution"; id: string; amountCents: number; memberId: string; note: string | null; createdAt: Date }
  | {
      type: "withdrawal";
      id: string;
      amountCents: number;
      reason: string;
      receiptUrl: string | null;
      status: string;
      resolvedAt: Date | null;
      createdAt: Date;
    };

// ── Repository ────────────────────────────────────────────────────────────

export const withdrawalRepository = {
  async create(input: {
    poolId: string;
    requestedByUserId: string;
    amountCents: number;
    reason: string;
    receiptUrl?: string;
  }): Promise<PoolWithdrawal> {
    return prisma.poolWithdrawal.create({ data: input });
  },

  async list(poolId: string): Promise<WithdrawalWithVotes[]> {
    const rows = await prisma.poolWithdrawal.findMany({
      where: { poolId },
      include: { votes: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((w) => ({
      ...w,
      approveCount: w.votes.filter((v) => v.vote === "APPROVE").length,
      rejectCount: w.votes.filter((v) => v.vote === "REJECT").length,
    }));
  },

  async findById(id: string): Promise<(PoolWithdrawal & { votes: WithdrawalVote[] }) | null> {
    return prisma.poolWithdrawal.findUnique({ where: { id }, include: { votes: true } });
  },

  /**
   * Insert a vote and, within the same transaction, auto-resolve the withdrawal
   * if approval or rejection thresholds are crossed.
   *
   * Thresholds (based on total member count):
   *   approve  → ceil(memberCount / 2)
   *   reject   → floor(memberCount / 2) + 1
   */
  async castVote(
    withdrawalId: string,
    voterId: string,   // PoolMember.id
    voteValue: VoteValue,
    memberCount: number,
  ): Promise<WithdrawalVote> {
    return prisma.$transaction(async (tx) => {
      const vote = await tx.withdrawalVote.create({
        data: { withdrawalId, voterId, vote: voteValue },
      });

      // Re-tally after inserting
      const allVotes = await tx.withdrawalVote.findMany({ where: { withdrawalId } });
      const approves = allVotes.filter((v) => v.vote === "APPROVE").length;
      const rejects  = allVotes.filter((v) => v.vote === "REJECT").length;

      const approveThreshold = Math.ceil(memberCount / 2);
      const rejectThreshold  = Math.floor(memberCount / 2) + 1;

      if (approves >= approveThreshold) {
        await tx.poolWithdrawal.update({
          where: { id: withdrawalId },
          data: { status: "APPROVED", resolvedAt: new Date() },
        });
      } else if (rejects >= rejectThreshold) {
        await tx.poolWithdrawal.update({
          where: { id: withdrawalId },
          data: { status: "REJECTED", resolvedAt: new Date() },
        });
      }

      return vote;
    });
  },

  /** Interleave contributions and withdrawals ordered by createdAt. */
  async getLedger(poolId: string): Promise<LedgerEntry[]> {
    const [contributions, withdrawals] = await Promise.all([
      prisma.poolContribution.findMany({ where: { poolId }, orderBy: { createdAt: "asc" } }),
      prisma.poolWithdrawal.findMany({ where: { poolId }, orderBy: { createdAt: "asc" } }),
    ]);

    const entries: LedgerEntry[] = [
      ...contributions.map((c) => ({
        type: "contribution" as const,
        id: c.id,
        amountCents: c.amountCents,
        memberId: c.memberId,
        note: c.note,
        createdAt: c.createdAt,
      })),
      ...withdrawals.map((w) => ({
        type: "withdrawal" as const,
        id: w.id,
        amountCents: w.amountCents,
        reason: w.reason,
        receiptUrl: w.receiptUrl,
        status: w.status,
        resolvedAt: w.resolvedAt,
        createdAt: w.createdAt,
      })),
    ];

    return entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  /** Sum of approved withdrawal amounts for a pool. */
  async approvedTotal(poolId: string): Promise<number> {
    const rows = await prisma.poolWithdrawal.findMany({
      where: { poolId, status: "APPROVED" },
      select: { amountCents: true },
    });
    return rows.reduce((s, w) => s + w.amountCents, 0);
  },
};
