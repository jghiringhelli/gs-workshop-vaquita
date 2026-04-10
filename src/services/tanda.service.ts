import { config } from '../config';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../errors';
import * as tandaRepo from '../repositories/tanda.repository';
import * as userRepo from '../repositories/user.repository';
import * as withdrawalRepo from '../repositories/withdrawal.repository';

/** Create a tanda and auto-add the creator as organizer. */
export function createTanda(
  name: string,
  organizerId: number,
  contributionAmount: number,
  totalRounds: number,
) {
  const tanda = tandaRepo.create(name, organizerId, contributionAmount, totalRounds);
  tandaRepo.addParticipant(tanda.id, organizerId, 'organizer');
  return tanda;
}

/** Return tanda with participant list and total paid contributions. */
export function getTandaDetail(tandaId: number) {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  const participants = tandaRepo.findParticipants(tandaId);
  const totalContributions = tandaRepo.sumPaidContributions(tandaId);
  return { ...tanda, participants, totalContributions };
}

/** Add a user as a member of a forming tanda. */
export function joinTanda(tandaId: number, userId: number) {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.status !== 'forming') {
    throw new ValidationError('Can only join a tanda in forming status');
  }

  const user = userRepo.findById(userId);
  if (!user) throw new NotFoundError('User', userId);

  if (tandaRepo.findParticipant(tandaId, userId)) {
    throw new ConflictError('User is already a participant in this tanda');
  }

  const count = tandaRepo.countParticipants(tandaId);
  if (count >= config.maxParticipants) {
    throw new ValidationError(
      `Tanda is full (max ${config.maxParticipants} participants)`,
    );
  }

  return tandaRepo.addParticipant(tandaId, userId, 'member');
}

/**
 * Start a forming tanda (organizer only).
 * Requires at least 3 participants; sets totalRounds = participantCount and
 * randomizes rotation positions.
 */
export function startTanda(tandaId: number, organizerId: number) {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.organizerId !== organizerId) {
    throw new ForbiddenError('Only the organizer can start the tanda');
  }
  if (tanda.status !== 'forming') {
    throw new ValidationError('Only a forming tanda can be started');
  }

  const participants = tandaRepo.findParticipants(tandaId);
  if (participants.length < 3) {
    throw new ValidationError('A tanda needs at least 3 participants to start');
  }

  // Shuffle for random rotation order (Fisher-Yates)
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  tandaRepo.setRotationPositions(
    tandaId,
    shuffled.map((p, idx) => ({ participantId: p.id, position: idx + 1 })),
  );

  tandaRepo.updateStatus(tandaId, 'active');
  return tandaRepo.findById(tandaId) as NonNullable<
    ReturnType<typeof tandaRepo.findById>
  >;
}

/**
 * Record a paid contribution for the current round.
 * Auto-completes the tanda when the final round is fully funded.
 */
export function recordContribution(tandaId: number, userId: number) {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.status !== 'active') {
    throw new ValidationError('Contributions are only accepted for active tandas');
  }

  const participant = tandaRepo.findParticipant(tandaId, userId);
  if (!participant) {
    throw new ForbiddenError('You are not a participant in this tanda');
  }

  if (tandaRepo.findContribution(tandaId, participant.id, tanda.currentRound)) {
    throw new ConflictError(
      `Contribution already recorded for round ${tanda.currentRound}`,
    );
  }

  const contribution = tandaRepo.createContribution(
    tandaId,
    participant.id,
    tanda.currentRound,
    tanda.contributionAmount,
  );

  // Auto-complete when every participant has paid in the final round
  const paidCount = tandaRepo.countPaidForRound(tandaId, tanda.currentRound);
  const totalParticipants = tandaRepo.countParticipants(tandaId);
  if (paidCount >= totalParticipants && tanda.currentRound >= tanda.totalRounds) {
    tandaRepo.updateStatus(tandaId, 'completed');
  }

  return contribution;
}

/** Live balance: sum of paid contributions minus sum of approved withdrawals. */
export function getBalance(tandaId: number) {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  const totalContributions = tandaRepo.sumPaidContributions(tandaId);
  const totalWithdrawn = withdrawalRepo.sumApproved(tandaId);
  return { tandaId, balance: totalContributions - totalWithdrawn, status: tanda.status };
}

/** Organizer dissolves (cancels) a tanda. */
export function dissolveTanda(tandaId: number, userId: number) {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  if (tanda.organizerId !== userId) {
    throw new ForbiddenError('Only the organizer can dissolve the tanda');
  }
  if (tanda.status === 'cancelled' || tanda.status === 'completed') {
    throw new ValidationError(`Tanda is already ${tanda.status}`);
  }
  tandaRepo.updateStatus(tandaId, 'cancelled');
  return tandaRepo.findById(tandaId)!;
}

/** List tandas — optionally filtered by organizerId. */
export function listTandas(organizerId?: number) {
  return tandaRepo.findAll(organizerId);
}

/** Public no-auth summary. */
export function getPreview(tandaId: number) {
  const tanda = tandaRepo.findById(tandaId);
  if (!tanda) throw new NotFoundError('Tanda', tandaId);
  const participantCount = tandaRepo.countParticipants(tandaId);
  const totalContributions = tandaRepo.sumPaidContributions(tandaId);
  return {
    id: tanda.id,
    name: tanda.name,
    contributionAmount: tanda.contributionAmount,
    status: tanda.status,
    currentRound: tanda.currentRound,
    totalRounds: tanda.totalRounds,
    participantCount,
    totalContributions,
  };
}
