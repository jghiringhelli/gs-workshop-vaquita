import { TandaRepository, Tanda } from '../repositories/tanda';
import { ParticipantRepository } from '../repositories/participant';
import { ContributionRepository } from '../repositories/contribution';
import { UserRepository } from '../repositories/user';
import { CreateTandaInput } from '../schemas';
import { config } from '../config';
import { BusinessRuleError, ForbiddenError } from '../errors';

export class TandaService {
  constructor(
    private tandaRepo: TandaRepository,
    private participantRepo: ParticipantRepository,
    private contributionRepo: ContributionRepository,
    private userRepo: UserRepository
  ) {}

  create(input: CreateTandaInput): Tanda {
    // Verify organizer exists
    this.userRepo.getById(input.organizerId);

    const tanda = this.tandaRepo.create(
      input.name,
      input.organizerId,
      input.contributionAmount,
      input.totalRounds
    );

    // Organizer auto-joins as first participant
    this.participantRepo.create(input.organizerId, tanda.id, 'organizer');

    return tanda;
  }

  getById(id: string): Tanda {
    return this.tandaRepo.getById(id);
  }

  list(userId?: string): Tanda[] {
    if (userId) {
      // Verify user exists
      this.userRepo.getById(userId);
      return this.tandaRepo.list(userId);
    }
    return this.tandaRepo.list();
  }

  join(tandaId: string, userId: string): void {
    const tanda = this.tandaRepo.getById(tandaId);
    
    // Verify user exists
    this.userRepo.getById(userId);

    if (tanda.status !== 'forming') {
      throw new BusinessRuleError(
        'Can only join a tanda in forming status',
        'CANNOT_JOIN_ACTIVE_TANDA'
      );
    }

    // Check if already a participant
    const existing = this.participantRepo.getByUserAndTanda(userId, tandaId);
    if (existing) {
      throw new BusinessRuleError(
        'User is already a participant in this tanda',
        'ALREADY_PARTICIPANT'
      );
    }

    // Check max participants
    const participants = this.participantRepo.getByTanda(tandaId);
    if (participants.length >= config.MAX_PARTICIPANTS) {
      throw new BusinessRuleError(
        `Tanda has reached maximum participants (${config.MAX_PARTICIPANTS})`,
        'MAX_PARTICIPANTS_REACHED'
      );
    }

    this.participantRepo.create(userId, tandaId, 'member');
  }

  start(tandaId: string, organizerId: string): Tanda {
    const tanda = this.tandaRepo.getById(tandaId);

    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError('Only the organizer can start a tanda');
    }

    if (tanda.status !== 'forming') {
      throw new BusinessRuleError(
        'Tanda is not in forming status',
        'INVALID_STATE_TRANSITION'
      );
    }

    const participants = this.participantRepo.getByTanda(tandaId);

    if (participants.length < config.MIN_PARTICIPANTS) {
      throw new BusinessRuleError(
        `Tanda needs at least ${config.MIN_PARTICIPANTS} participants (current: ${participants.length})`,
        'INSUFFICIENT_PARTICIPANTS'
      );
    }

    // Randomize rotation order
    const shuffled = this.shuffleArray([...participants]);
    const participantIds = shuffled.map((p) => p.id);
    this.participantRepo.updateRotationOrder(tandaId, participantIds);

    // Create contribution records for each participant for each round
    for (let round = 1; round <= tanda.totalRounds; round++) {
      for (const participant of participantIds) {
        this.contributionRepo.create(tandaId, participant, round, tanda.contributionAmount);
      }
    }

    return this.tandaRepo.update(tandaId, { status: 'active', currentRound: 1 });
  }

  cancel(tandaId: string, organizerId: string): Tanda {
    const tanda = this.tandaRepo.getById(tandaId);

    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError('Only the organizer can cancel a tanda');
    }

    if (tanda.status === 'completed') {
      throw new BusinessRuleError('Cannot cancel a completed tanda', 'CANNOT_CANCEL_COMPLETED');
    }

    return this.tandaRepo.cancel(tandaId);
  }

  advance(tandaId: string, organizerId: string): Tanda {
    const tanda = this.tandaRepo.getById(tandaId);

    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError('Only the organizer can advance rounds');
    }

    if (tanda.status !== 'active') {
      throw new BusinessRuleError('Tanda is not active', 'INVALID_STATE_TRANSITION');
    }

    const nextRound = tanda.currentRound + 1;

    if (nextRound > tanda.totalRounds) {
      // Auto-complete after last round
      return this.tandaRepo.update(tandaId, {
        status: 'completed',
        currentRound: nextRound,
      });
    }

    return this.tandaRepo.update(tandaId, { currentRound: nextRound });
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
