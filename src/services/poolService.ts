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

  async requestWithdrawal(poolId: number, userId: number, amountCents: number, note?: string) {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError('Pool', poolId);
    if (pool.status === 'closed') {
      throw new BusinessRuleError('Cannot request a withdrawal from a closed pool');
    }

    const member = await poolRepository.findMember(poolId, userId);
    if (!member) throw new ForbiddenError('You are not a member of this pool');

    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new ValidationError('amountCents must be a positive integer');
    }

    return poolRepository.addWithdrawal(poolId, member.id, amountCents, note);
  },

  async approveWithdrawal(poolId: number, withdrawalId: number, organizerId: number) {
    const pool = await poolRepository.findById(poolId);
    if (!pool) throw new NotFoundError('Pool', poolId);
    if (pool.organizerId !== organizerId) {
      throw new ForbiddenError('Only the organizer can approve withdrawals');
    }

    const withdrawal = await poolRepository.findWithdrawal(withdrawalId);
    if (!withdrawal || withdrawal.poolId !== poolId) {
      throw new NotFoundError('Withdrawal', withdrawalId);
    }
    if (withdrawal.status !== 'pending') {
      throw new BusinessRuleError('Only pending withdrawals can be approved');
    }

    return poolRepository.approveWithdrawal(withdrawalId);
  },
};
