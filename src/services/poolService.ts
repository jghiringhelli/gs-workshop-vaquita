import { poolRepository } from '../repositories/poolRepository';
import { userRepository } from '../repositories/userRepository';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BusinessRuleError,
  ValidationError,
} from '../errors/AppError';

const SUPPORTED_CURRENCIES = ['MXN', 'USD', 'EUR', 'CAD', 'GBP', 'COP', 'ARS'];

export const poolService = {
  async create(
    organizerId: number,
    data: { name: string; purpose?: string; targetAmount: number; currency?: string },
  ) {
    const currency = (data.currency ?? 'MXN').toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      throw new ValidationError(
        `Unsupported currency "${currency}". Use one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
      );
    }
    if (data.targetAmount <= 0) {
      throw new ValidationError('targetAmount must be positive');
    }
    return poolRepository.create({ ...data, currency, organizerId });
  },

  async getById(id: number) {
    const pool = await poolRepository.findById(id);
    if (!pool) throw new NotFoundError('Pool', id);
    return pool;
  },

  async invite(poolId: number, organizerId: number, userId: number) {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError('Pool', poolId);
    if (pool.status === 'closed') throw new BusinessRuleError('Cannot invite to a closed pool');
    if (pool.organizerId !== organizerId) {
      throw new ForbiddenError('Only the organizer can invite members');
    }

    const invitedUser = await userRepository.findById(userId);
    if (!invitedUser) throw new NotFoundError('User', userId);

    const existing = await poolRepository.findMember(poolId, userId);
    if (existing) throw new ConflictError('User is already a member of this pool');

    return poolRepository.addMember(poolId, userId);
  },

  async contribute(
    poolId: number,
    userId: number,
    amountCents: number,
    note?: string,
  ) {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError('Pool', poolId);
    if (pool.status !== 'open') {
      throw new BusinessRuleError('Only open pools accept contributions');
    }

    const member = await poolRepository.findMember(poolId, userId);
    if (!member) throw new ForbiddenError('You are not a member of this pool');

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new ValidationError('amountCents must be a positive integer');
    }

    const contribution = await poolRepository.addContribution(member.id, poolId, amountCents, note);

    // Auto-transition: funded when total contributions reach target
    const totalCents = await poolRepository.sumContributions(poolId);
    const targetCents = Math.round(pool.targetAmount * 100);
    if (totalCents >= targetCents) {
      await poolRepository.updateStatus(poolId, 'funded');
    }

    return contribution;
  },

  async getBalance(poolId: number) {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError('Pool', poolId);

    const contributionsCents = await poolRepository.sumContributions(poolId);
    const withdrawalsCents = await poolRepository.sumApprovedWithdrawals(poolId);

    return {
      poolId,
      status: pool.status,
      currency: pool.currency,
      targetAmountCents: Math.round(pool.targetAmount * 100),
      contributionsCents,
      approvedWithdrawalsCents: withdrawalsCents,
      balanceCents: contributionsCents - withdrawalsCents,
    };
  },

  async getPreview(poolId: number) {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError('Pool', poolId);

    const contributionsCents = await poolRepository.sumContributions(poolId);
    const targetCents = Math.round(pool.targetAmount * 100);
    const progressPct =
      targetCents > 0 ? Math.min(100, Math.round((contributionsCents / targetCents) * 100)) : 0;

    return {
      id: pool.id,
      name: pool.name,
      purpose: pool.purpose ?? null,
      status: pool.status,
      currency: pool.currency,
      targetAmountCents: targetCents,
      totalContributionsCents: contributionsCents,
      memberCount: pool.members.length,
      progressPct,
    };
  },

  /** Organiser requests a withdrawal. receiptUrl is optional here but required before voting. */
  async requestWithdrawal(
    poolId: number,
    userId: number,
    amountCents: number,
    data: { reason?: string; receiptUrl?: string },
  ) {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError('Pool', poolId);
    if (pool.status === 'closed') {
      throw new BusinessRuleError('Cannot request a withdrawal from a closed pool');
    }
    if (pool.organizerId !== userId) {
      throw new ForbiddenError('Only the organizer can request withdrawals');
    }

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new ValidationError('amountCents must be a positive integer');
    }

    const member = await poolRepository.findMember(poolId, userId);
    if (!member) throw new ForbiddenError('You are not a member of this pool');

    return poolRepository.addWithdrawal(poolId, member.id, amountCents, data);
  },

  async listWithdrawals(poolId: number, userId: number) {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError('Pool', poolId);

    const member = await poolRepository.findMember(poolId, userId);
    if (!member) throw new ForbiddenError('You are not a member of this pool');

    const withdrawals = await poolRepository.listWithdrawals(poolId);
    return withdrawals.map((w) => ({
      ...w,
      approveVotes: w.votes.filter((v) => v.vote === 'approve').length,
      rejectVotes: w.votes.filter((v) => v.vote === 'reject').length,
    }));
  },

  async vote(withdrawalId: number, userId: number, voteChoice: 'approve' | 'reject') {
    const withdrawal = await poolRepository.findWithdrawal(withdrawalId);
    if (!withdrawal) throw new NotFoundError('Withdrawal', withdrawalId);

    if (withdrawal.status !== 'pending') {
      throw new BusinessRuleError('Cannot vote on a withdrawal that is already resolved');
    }

    if (!withdrawal.receiptUrl) {
      throw new BusinessRuleError('A receipt URL must be attached before votes can be cast');
    }

    const member = await poolRepository.findMember(withdrawal.poolId, userId);
    if (!member) throw new ForbiddenError('You are not a member of this pool');

    if (member.id === withdrawal.requestedBy) {
      throw new ForbiddenError('You cannot vote on your own withdrawal request');
    }

    const existing = await poolRepository.findVote(withdrawalId, member.id);
    if (existing) throw new ConflictError('You have already voted on this withdrawal');

    await poolRepository.addVote(withdrawalId, member.id, voteChoice);

    // Re-fetch pool for current member count
    const pool = await poolRepository.findById(withdrawal.poolId);
    const memberCount = pool!.members.length;
    const approveThreshold = Math.ceil(memberCount / 2);
    const rejectThreshold = Math.floor(memberCount / 2) + 1;

    const votes = await poolRepository.countVotes(withdrawalId);
    const resolvedAt = new Date();

    if (votes.approve >= approveThreshold) {
      return poolRepository.resolveWithdrawal(withdrawalId, 'approved', resolvedAt);
    }
    if (votes.reject >= rejectThreshold) {
      return poolRepository.resolveWithdrawal(withdrawalId, 'rejected', resolvedAt);
    }

    return poolRepository.findWithdrawal(withdrawalId);
  },

  async getLedger(poolId: number, userId: number) {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError('Pool', poolId);

    const member = await poolRepository.findMember(poolId, userId);
    if (!member) throw new ForbiddenError('You are not a member of this pool');

    const [contributions, withdrawals] = await Promise.all([
      poolRepository.listContributions(poolId),
      poolRepository.listWithdrawals(poolId),
    ]);

    const ledger = [
      ...contributions.map((c) => ({
        type: 'contribution' as const,
        id: c.id,
        amountCents: c.amountCents,
        note: c.note ?? null,
        member: c.member.user,
        createdAt: c.createdAt,
      })),
      ...withdrawals.map((w) => ({
        type: 'withdrawal' as const,
        id: w.id,
        amountCents: w.amountCents,
        reason: w.reason ?? null,
        receiptUrl: w.receiptUrl ?? null,
        status: w.status,
        resolvedAt: w.resolvedAt ?? null,
        requestedBy: w.requester.user,
        approveVotes: w.votes.filter((v) => v.vote === 'approve').length,
        rejectVotes: w.votes.filter((v) => v.vote === 'reject').length,
        createdAt: w.createdAt,
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return { poolId, currency: pool.currency, entries: ledger };
  },

  async dissolve(poolId: number, userId: number) {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError('Pool', poolId);
    if (pool.organizerId !== userId) {
      throw new ForbiddenError('Only the organizer can dissolve the pool');
    }
    if (pool.status === 'closed') {
      throw new BusinessRuleError('Pool is already closed');
    }

    // Reject all pending withdrawals, then close the pool
    await poolRepository.rejectPendingWithdrawals(poolId);
    return poolRepository.updateStatus(poolId, 'closed');
  },
};
