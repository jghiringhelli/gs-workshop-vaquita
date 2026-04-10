import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../errors';
import * as tandaRepo from '../repositories/tanda.repository';
import * as withdrawalRepo from '../repositories/withdrawal.repository';

export function requestWithdrawal(
  tandaId: number,
  userId: number,
  amountCents: number,
  reason: string,
  receiptUrl: string | null,
) {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.organizerId !== userId) {
    throw new ForbiddenError('Only the organizer can request a withdrawal');
  }
  if (tanda.status === 'cancelled') {
    throw new ValidationError('Cannot withdraw from a cancelled tanda');
  }
  return withdrawalRepo.create(tandaId, userId, amountCents, reason, receiptUrl);
}

export function listWithdrawals(tandaId: number) {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  return withdrawalRepo.listWithVoteCounts(tandaId);
}

export function castVote(
  withdrawalId: number,
  voterId: number,
  vote: 'approve' | 'reject',
) {
  const withdrawal = withdrawalRepo.findById(withdrawalId);
  if (!withdrawal) throw new NotFoundError('Withdrawal', withdrawalId);

  // Authorization checks first
  const participant = tandaRepo.findParticipant(withdrawal.tandaId, voterId);
  if (!participant) {
    throw new ForbiddenError('You are not a participant in this tanda');
  }

  if (withdrawal.requestedBy === voterId) {
    throw new ForbiddenError('You cannot vote on your own withdrawal request');
  }

  // Business rule checks
  if (withdrawal.status !== 'pending') {
    throw new ValidationError(`Withdrawal is already ${withdrawal.status}`);
  }

  if (!withdrawal.receiptUrl) {
    throw new ValidationError(
      'A receipt URL must be present before any vote can be cast',
    );
  }

  if (withdrawalRepo.findVote(withdrawalId, voterId)) {
    throw new ConflictError('You have already voted on this withdrawal');
  }

  withdrawalRepo.addVote(withdrawalId, voterId, vote);

  // Re-count and check thresholds
  const memberCount = tandaRepo.countParticipants(withdrawal.tandaId);
  const { approveCount, rejectCount } = withdrawalRepo.countVotes(withdrawalId);

  const approveThreshold = Math.ceil(memberCount / 2);
  const rejectThreshold = Math.floor(memberCount / 2) + 1;

  if (approveCount >= approveThreshold) {
    withdrawalRepo.resolveWithdrawal(withdrawalId, 'approved');
  } else if (rejectCount >= rejectThreshold) {
    withdrawalRepo.resolveWithdrawal(withdrawalId, 'rejected');
  }

  return withdrawalRepo.findById(withdrawalId);
}

export function getLedger(tandaId: number) {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);

  const contributions = tandaRepo.listContributions(tandaId).map((c) => ({
    type: 'contribution' as const,
    ...c,
  }));

  const withdrawals = withdrawalRepo.listForLedger(tandaId).map((w) => ({
    type: 'withdrawal' as const,
    ...w,
  }));

  return [...contributions, ...withdrawals].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}
