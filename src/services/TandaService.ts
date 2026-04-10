import { config } from '../config/env';
import type { TandaRepository } from '../repositories/TandaRepository';
import type { ParticipantRepository } from '../repositories/ParticipantRepository';
import type { ContributionRepository } from '../repositories/ContributionRepository';
import type { UserRepository } from '../repositories/UserRepository';
import type { CreateTandaDto, JoinTandaDto } from '../validators/tanda.validator';
import type { Tanda, Participant, RoundSummary } from '../models';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BusinessRuleError,
} from '../errors/AppError';

export class TandaService {
  constructor(
    private readonly tandaRepository: TandaRepository,
    private readonly participantRepository: ParticipantRepository,
    private readonly contributionRepository: ContributionRepository,
    private readonly userRepository: UserRepository,
  ) {}

  createTanda(dto: CreateTandaDto): Tanda {
    const organizer = this.userRepository.findById(dto.organizerId);
    if (!organizer) throw new NotFoundError('User', dto.organizerId);

    const tanda = this.tandaRepository.create({
      name: dto.name,
      organizerId: dto.organizerId,
      contributionAmount: dto.contributionAmount,
    });

    this.participantRepository.create({
      userId: dto.organizerId,
      tandaId: tanda.id,
      role: 'organizer',
    });

    return tanda;
  }

  listTandas(userId: string): Tanda[] {
    return this.tandaRepository.findByUserId(userId);
  }

  getTanda(id: string): Tanda {
    const tanda = this.tandaRepository.findById(id);
    if (!tanda) throw new NotFoundError('Tanda', id);
    return tanda;
  }

  joinTanda(tandaId: string, dto: JoinTandaDto): Participant {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.status !== 'forming') throw new BusinessRuleError('Can only join a tanda in forming status');

    const user = this.userRepository.findById(dto.userId);
    if (!user) throw new NotFoundError('User', dto.userId);

    const existing = this.participantRepository.findByUserAndTanda(dto.userId, tandaId);
    if (existing) throw new ConflictError('User is already a participant in this tanda');

    const count = this.participantRepository.countByTandaId(tandaId);
    if (count >= config.maxParticipants) {
      throw new BusinessRuleError(`Tanda has reached the maximum of ${config.maxParticipants} participants`);
    }

    return this.participantRepository.create({
      userId: dto.userId,
      tandaId,
      role: 'member',
    });
  }

  startTanda(tandaId: string, requestingUserId: string): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.organizerId !== requestingUserId) throw new ForbiddenError('Only the organizer can start the tanda');
    if (tanda.status !== 'forming') throw new BusinessRuleError('Tanda can only be started from forming status');

    const count = this.participantRepository.countByTandaId(tandaId);
    if (count < config.minParticipants) {
      throw new BusinessRuleError(`Tanda requires at least ${config.minParticipants} participants to start`);
    }

    const participants = this.participantRepository.findByTandaId(tandaId);
    const shuffled = [...participants].sort(() => Math.random() - 0.5).map(p => p.id);
    this.participantRepository.assignRotationPositions(tandaId, shuffled);
    this.tandaRepository.updateTotalRounds(tandaId, count);
    this.tandaRepository.updateStatus(tandaId, 'active');

    return this.tandaRepository.findById(tandaId)!;
  }

  cancelTanda(tandaId: string, requestingUserId: string): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.organizerId !== requestingUserId) throw new ForbiddenError('Only the organizer can cancel the tanda');
    if (tanda.status === 'completed' || tanda.status === 'cancelled') {
      throw new BusinessRuleError('Tanda is already completed or cancelled');
    }

    this.tandaRepository.updateStatus(tandaId, 'cancelled');
    return this.tandaRepository.findById(tandaId)!;
  }

  listParticipants(tandaId: string): Participant[] {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    return this.participantRepository.findByTandaId(tandaId);
  }

  getRoundSummary(tandaId: string, round: number): RoundSummary {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);

    const participants = this.participantRepository.findByTandaId(tandaId);
    const recipient = participants.find(p => p.rotationPosition === round);
    if (!recipient) throw new BusinessRuleError(`No participant assigned to round ${round}`);

    const contributions = this.contributionRepository.findByTandaAndRound(tandaId, round);
    const totalCollected = contributions.reduce((sum, c) => sum + c.amount, 0);
    const allPaid = contributions.length === participants.length &&
      contributions.every(c => c.status === 'paid' || c.status === 'late');

    return {
      round,
      recipientParticipantId: recipient.id,
      contributions,
      totalCollected,
      allPaid,
    };
  }

  advanceRound(tandaId: string, requestingUserId: string): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) throw new NotFoundError('Tanda', tandaId);
    if (tanda.organizerId !== requestingUserId) throw new ForbiddenError('Only the organizer can advance the round');
    if (tanda.status !== 'active') throw new BusinessRuleError('Tanda must be active to advance round');

    const nextRound = tanda.currentRound + 1;
    const newStatus = nextRound > tanda.totalRounds ? 'completed' : 'active';
    this.tandaRepository.advanceRound(tandaId, nextRound, newStatus);

    return this.tandaRepository.findById(tandaId)!;
  }
}
