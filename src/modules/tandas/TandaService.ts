import { Tanda } from './Tanda';
import { ITandaRepository } from './ITandaRepository';
import { IParticipantRepository } from '../participants/IParticipantRepository';
import { IContributionRepository } from '../contributions/IContributionRepository';
import { IUserRepository } from '../users/IUserRepository';
import { Participant } from '../participants/Participant';
import { Contribution } from '../contributions/Contribution';
import { config } from '../../config';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BusinessRuleError,
} from '../../errors/AppError';

export class TandaService {
  constructor(
    private readonly tandaRepo: ITandaRepository,
    private readonly participantRepo: IParticipantRepository,
    private readonly contributionRepo: IContributionRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  /** Create a tanda and auto-join the organizer as first participant */
  createTanda(dto: { name: string; organizerId: string; contributionAmount: number }): Tanda {
    const organizer = this.userRepo.findById(dto.organizerId);
    if (!organizer) throw new NotFoundError('User', dto.organizerId);

    const tanda = this.tandaRepo.create({
      name: dto.name,
      organizerId: dto.organizerId,
      contributionAmount: dto.contributionAmount,
    });

    this.participantRepo.create({
      userId: dto.organizerId,
      tandaId: tanda.id,
      role: 'organizer',
    });

    return tanda;
  }

  /** List tandas for a user */
  listTandas(userId?: string): Tanda[] {
    if (userId) {
      const user = this.userRepo.findById(userId);
      if (!user) throw new NotFoundError('User', userId);
      return this.tandaRepo.findByUserId(userId);
    }
    return [];
  }

  /** Get tanda by ID */
  getTandaById(id: string): Tanda {
    const tanda = this.tandaRepo.findById(id);
    if (!tanda) throw new NotFoundError('Tanda', id);
    return tanda;
  }

  /** Join a tanda (must be forming, not already joined, not over max) */
  joinTanda(tandaId: string, userId: string): Participant {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    const user = this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    if (tanda.status !== 'forming') {
      throw new BusinessRuleError('Cannot join a tanda that is not in forming status');
    }

    const existing = this.participantRepo.findByUserIdAndTandaId(userId, tandaId);
    if (existing) throw new ConflictError('User is already a participant in this tanda');

    const count = this.participantRepo.countByTandaId(tandaId);
    if (count >= config.maxParticipants) {
      throw new BusinessRuleError(
        `Tanda has reached the maximum of ${config.maxParticipants} participants`,
      );
    }

    return this.participantRepo.create({ userId, tandaId, role: 'member' });
  }

  /** Start a tanda: organizer only, min participants, randomize rotation */
  startTanda(tandaId: string, userId: string): Tanda {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    if (tanda.organizerId !== userId) {
      throw new ForbiddenError('Only the organizer can start a tanda');
    }

    if (tanda.status !== 'forming') {
      throw new BusinessRuleError('Tanda is not in forming status');
    }

    const participants = this.participantRepo.findByTandaId(tandaId);
    if (participants.length < config.minParticipants) {
      throw new BusinessRuleError(
        `Tanda needs at least ${config.minParticipants} participants to start`,
      );
    }

    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const assignments = shuffled.map((p, i) => ({ id: p.id, position: i + 1 }));
    this.participantRepo.assignRotationPositions(tandaId, assignments);

    this.tandaRepo.updateTotalRounds(tandaId, participants.length);
    this.tandaRepo.updateStatus(tandaId, 'active');

    return this.tandaRepo.findById(tandaId)!;
  }

  /** Cancel a tanda (organizer only, forming or active) */
  cancelTanda(tandaId: string, userId: string): Tanda {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    if (tanda.organizerId !== userId) {
      throw new ForbiddenError('Only the organizer can cancel a tanda');
    }

    if (tanda.status === 'completed' || tanda.status === 'cancelled') {
      throw new BusinessRuleError(`Cannot cancel a tanda with status ${tanda.status}`);
    }

    this.tandaRepo.updateStatus(tandaId, 'cancelled');
    return this.tandaRepo.findById(tandaId)!;
  }

  /** List participants for a tanda */
  listParticipants(tandaId: string): Participant[] {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    return this.participantRepo.findByTandaId(tandaId);
  }

  /** Record a contribution for the current round */
  recordContribution(tandaId: string, participantId: string, userId: string): Contribution {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    if (tanda.status !== 'active') {
      throw new BusinessRuleError('Contributions can only be recorded for active tandas');
    }

    const participant = this.participantRepo.findById(participantId);
    if (!participant) throw new NotFoundError('Participant', participantId);

    if (participant.tandaId !== tandaId) {
      throw new BusinessRuleError('Participant does not belong to this tanda');
    }

    if (participant.userId !== userId) {
      throw new ForbiddenError('You can only record contributions for yourself');
    }

    const existing = this.contributionRepo.findByParticipantAndRound(
      participantId,
      tanda.currentRound,
    );
    if (existing) {
      throw new ConflictError('Contribution already recorded for this round');
    }

    return this.contributionRepo.create({
      tandaId,
      participantId,
      round: tanda.currentRound,
      amount: tanda.contributionAmount,
      status: 'paid',
      paidAt: new Date().toISOString(),
    });
  }

  /** Get round summary */
  getRoundSummary(
    tandaId: string,
    round: number,
  ): {
    round: number;
    receiverId: string | null;
    totalCollected: number;
    contributions: Contribution[];
  } {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    const contributions = this.contributionRepo.findByTandaAndRound(tandaId, round);
    const totalCollected = contributions
      .filter((c) => c.status === 'paid' || c.status === 'late')
      .reduce((sum, c) => sum + c.amount, 0);

    const participants = this.participantRepo.findByTandaId(tandaId);
    const receiver = participants.find((p) => p.rotationPosition === round);

    return {
      round,
      receiverId: receiver?.id ?? null,
      totalCollected,
      contributions,
    };
  }

  /** Advance to the next round (organizer only) */
  advanceTanda(tandaId: string, userId: string): Tanda {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    if (tanda.organizerId !== userId) {
      throw new ForbiddenError('Only the organizer can advance a tanda');
    }

    if (tanda.status !== 'active') {
      throw new BusinessRuleError('Tanda is not active');
    }

    const participants = this.participantRepo.findByTandaId(tandaId);

    const contributions = this.contributionRepo.findByTandaAndRound(tandaId, tanda.currentRound);
    const paidIds = new Set(
      contributions
        .filter((c) => c.status === 'paid' || c.status === 'late')
        .map((c) => c.participantId),
    );
    const missedIds = participants.filter((p) => !paidIds.has(p.id)).map((p) => p.id);

    if (missedIds.length > 0) {
      this.contributionRepo.markMissed(tandaId, tanda.currentRound, missedIds);
    }

    const nextRound = tanda.currentRound + 1;

    if (nextRound > tanda.totalRounds) {
      this.tandaRepo.updateStatus(tandaId, 'completed');
    } else {
      this.tandaRepo.updateCurrentRound(tandaId, nextRound);
    }

    return this.tandaRepo.findById(tandaId)!;
  }

  /** Get contribution history for a participant */
  getParticipantHistory(tandaId: string, participantId: string): Contribution[] {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    const participant = this.participantRepo.findById(participantId);
    if (!participant) throw new NotFoundError('Participant', participantId);

    if (participant.tandaId !== tandaId) {
      throw new BusinessRuleError('Participant does not belong to this tanda');
    }

    return this.contributionRepo.findByParticipantId(participantId);
  }
}

