import { TandaRepository } from '../repositories/tandaRepository';
import { ParticipantRepository } from '../repositories/participantRepository';
import { ContributionRepository } from '../repositories/contributionRepository';
import { UserRepository } from '../repositories/userRepository';
import {
  Tanda,
  Participant,
  Contribution,
  CreateTandaRequest,
  JoinTandaRequest,
  RecordContributionRequest,
} from '../models/types';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  BusinessRuleError,
} from '../errors/customErrors';
import { CONFIG, getLatePenaltyMultiplier } from '../config';

export class TandaService {
  constructor(
    private tandaRepository: TandaRepository,
    private participantRepository: ParticipantRepository,
    private contributionRepository: ContributionRepository,
    private userRepository: UserRepository
  ) {}

  createTanda(request: CreateTandaRequest): Tanda {
    const { name, organizerId, contributionAmount } = request;

    const organizer = this.userRepository.findById(organizerId);
    if (!organizer) {
      throw new NotFoundError(`User with id ${organizerId} not found`);
    }

    if (contributionAmount <= 0) {
      throw new ValidationError('Contribution amount must be positive');
    }

    const tanda = this.tandaRepository.create(name, organizerId, contributionAmount);

    this.participantRepository.create(organizerId, tanda.id, 'organizer');

    return tanda;
  }

  getTandaById(id: number): Tanda {
    const tanda = this.tandaRepository.findById(id);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${id} not found`);
    }
    return tanda;
  }

  listTandasByUser(userId: number): Tanda[] {
    const user = this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with id ${userId} not found`);
    }

    return this.tandaRepository.findByUserId(userId);
  }

  joinTanda(tandaId: number, request: JoinTandaRequest): Participant {
    const { userId } = request;

    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }

    if (tanda.status !== 'forming') {
      throw new BusinessRuleError('Can only join tandas that are forming');
    }

    const user = this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with id ${userId} not found`);
    }

    const existingParticipant = this.participantRepository.findByTandaAndUser(tandaId, userId);
    if (existingParticipant) {
      throw new BusinessRuleError('User has already joined this tanda');
    }

    const participantCount = this.participantRepository.countByTandaId(tandaId);
    if (participantCount >= CONFIG.MAX_PARTICIPANTS) {
      throw new BusinessRuleError(
        `Tanda has reached maximum participants (${CONFIG.MAX_PARTICIPANTS})`
      );
    }

    return this.participantRepository.create(userId, tandaId, 'member');
  }

  startTanda(tandaId: number, organizerId: number): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }

    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError('Only the organizer can start the tanda');
    }

    if (tanda.status !== 'forming') {
      throw new BusinessRuleError('Tanda must be in forming status to start');
    }

    const participantCount = this.participantRepository.countByTandaId(tandaId);
    if (participantCount < CONFIG.MIN_PARTICIPANTS) {
      throw new BusinessRuleError(
        `Tanda needs at least ${CONFIG.MIN_PARTICIPANTS} participants to start`
      );
    }

    const participants = this.participantRepository.findByTandaId(tandaId);
    
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    
    const positionMap = new Map<number, number>();
    shuffled.forEach((participant, index) => {
      positionMap.set(participant.id, index + 1);
    });

    this.participantRepository.assignRotationPositions(tandaId, positionMap);

    this.tandaRepository.setTotalRounds(tandaId, participantCount);
    this.tandaRepository.setCurrentRound(tandaId, 1);
    this.tandaRepository.updateStatus(tandaId, 'active');
    this.tandaRepository.setStartedAt(tandaId, new Date().toISOString());

    this.contributionRepository.createBulkForRound(
      tandaId,
      participants.map((p) => p.id),
      1,
      tanda.contributionAmount
    );

    return this.tandaRepository.findById(tandaId)!;
  }

  cancelTanda(tandaId: number, organizerId: number): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }

    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError('Only the organizer can cancel the tanda');
    }

    if (tanda.status === 'completed' || tanda.status === 'cancelled') {
      throw new BusinessRuleError(`Cannot cancel tanda with status ${tanda.status}`);
    }

    this.tandaRepository.updateStatus(tandaId, 'cancelled');

    return this.tandaRepository.findById(tandaId)!;
  }

  getParticipants(tandaId: number): Participant[] {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }

    return this.participantRepository.findByTandaId(tandaId);
  }

  recordContribution(
    tandaId: number,
    request: RecordContributionRequest
  ): Contribution {
    const { participantId, amount } = request;

    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }

    if (tanda.status !== 'active') {
      throw new BusinessRuleError('Can only record contributions for active tandas');
    }

    const participant = this.participantRepository.findById(participantId);
    if (!participant || participant.tandaId !== tandaId) {
      throw new NotFoundError(`Participant with id ${participantId} not found in this tanda`);
    }

    const currentRound = tanda.currentRound;
    const contributions = this.contributionRepository.findByTandaAndRound(tandaId, currentRound);
    const existingContribution = contributions.find((c) => c.participantId === participantId);

    if (!existingContribution) {
      throw new NotFoundError(
        `No pending contribution found for participant ${participantId} in round ${currentRound}`
      );
    }

    if (existingContribution.status === 'paid') {
      throw new BusinessRuleError('Contribution has already been paid');
    }

    const expectedAmount = tanda.contributionAmount;
    const isLate = amount > expectedAmount;
    const status = isLate ? 'late' : 'paid';

    this.contributionRepository.updateStatus(existingContribution.id, status);
    this.contributionRepository.setPaidAt(existingContribution.id, new Date().toISOString());

    return this.contributionRepository.findById(existingContribution.id)!;
  }

  getRoundSummary(tandaId: number, round: number): {
    tanda: Tanda;
    round: number;
    contributions: Contribution[];
    recipient: Participant | null;
  } {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }

    if (round < 1 || round > tanda.totalRounds) {
      throw new ValidationError(`Invalid round ${round}. Must be between 1 and ${tanda.totalRounds}`);
    }

    const contributions = this.contributionRepository.findByTandaAndRound(tandaId, round);
    const recipient = this.participantRepository.getRecipientForRound(tandaId, round);

    return {
      tanda,
      round,
      contributions,
      recipient,
    };
  }

  advanceToNextRound(tandaId: number, organizerId: number): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }

    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError('Only the organizer can advance to the next round');
    }

    if (tanda.status !== 'active') {
      throw new BusinessRuleError('Can only advance rounds for active tandas');
    }

    const currentRound = tanda.currentRound;
    const contributions = this.contributionRepository.findByTandaAndRound(tandaId, currentRound);

    contributions.forEach((contribution) => {
      if (contribution.status === 'pending') {
        this.contributionRepository.updateStatus(contribution.id, 'missed');

        const consecutiveMisses = this.contributionRepository.getConsecutiveMisses(
          contribution.participantId,
          currentRound
        );

        if (consecutiveMisses >= CONFIG.MAX_CONSECUTIVE_MISSES) {
          console.warn(
            `Participant ${contribution.participantId} has ${consecutiveMisses} consecutive misses`
          );
        }
      }
    });

    if (currentRound >= tanda.totalRounds) {
      this.tandaRepository.updateStatus(tandaId, 'completed');
      this.tandaRepository.setCompletedAt(tandaId, new Date().toISOString());
    } else {
      const nextRound = currentRound + 1;
      this.tandaRepository.setCurrentRound(tandaId, nextRound);

      const participants = this.participantRepository.findByTandaId(tandaId);
      this.contributionRepository.createBulkForRound(
        tandaId,
        participants.map((p) => p.id),
        nextRound,
        tanda.contributionAmount
      );
    }

    return this.tandaRepository.findById(tandaId)!;
  }

  getParticipantHistory(tandaId: number, participantId: number): Contribution[] {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda with id ${tandaId} not found`);
    }

    const participant = this.participantRepository.findById(participantId);
    if (!participant || participant.tandaId !== tandaId) {
      throw new NotFoundError(`Participant with id ${participantId} not found in this tanda`);
    }

    return this.contributionRepository.findByTandaAndParticipant(tandaId, participantId);
  }
}
