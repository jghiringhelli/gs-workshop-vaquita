import type { Tanda, Participant, Contribution } from '../domain/types.js';
import type {
  ITandaRepository,
  IParticipantRepository,
  IContributionRepository,
  IUserRepository,
} from '../domain/interfaces.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
  UnprocessableError,
} from '../errors/index.js';
import { config } from '../config.js';

/** Fisher-Yates shuffle — returns a new shuffled array. */
function shuffle<T>(array: readonly T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = temp;
  }
  return arr;
}

/** Handles all tanda lifecycle and contribution business logic. */
export class TandaService {
  constructor(
    private readonly tandaRepo: ITandaRepository,
    private readonly participantRepo: IParticipantRepository,
    private readonly contributionRepo: IContributionRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  /**
   * Create a new tanda and auto-join the organizer as first participant.
   * @param data - name, organizerId, contributionAmount
   * @returns The created Tanda record
   * @throws {NotFoundError} If the organizer user does not exist
   */
  createTanda(data: { name: string; organizerId: string; contributionAmount: number }): Tanda {
    const organizer = this.userRepo.findById(data.organizerId);
    if (!organizer) throw new NotFoundError(`User ${data.organizerId} not found`);

    const tanda = this.tandaRepo.create(data);
    this.participantRepo.create({ userId: data.organizerId, tandaId: tanda.id, role: 'organizer' });
    return tanda;
  }

  /**
   * List tandas, optionally filtering by participant userId.
   * @param userId - Optional user UUID to filter by participation
   * @returns Array of Tanda records
   */
  listTandas(userId?: string): Tanda[] {
    if (userId) return this.tandaRepo.findByUserId(userId);
    return this.tandaRepo.findAll();
  }

  /**
   * Retrieve a single tanda by ID.
   * @param id - UUID of the tanda
   * @returns The Tanda record
   * @throws {NotFoundError} If not found
   */
  getTandaById(id: string): Tanda {
    const tanda = this.tandaRepo.findById(id);
    if (!tanda) throw new NotFoundError(`Tanda ${id} not found`);
    return tanda;
  }

  /**
   * Add a user to a forming tanda as a member.
   * @param tandaId - UUID of the tanda
   * @param userId - UUID of the user joining
   * @returns The created Participant record
   * @throws {NotFoundError} If tanda or user not found
   * @throws {ConflictError} If tanda is not forming, or user already joined
   * @throws {ValidationError} If tanda is already at max capacity
   */
  joinTanda(tandaId: string, userId: string): Participant {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);

    if (tanda.status !== 'forming') {
      throw new ConflictError(`Cannot join a tanda with status '${tanda.status}'`);
    }

    const user = this.userRepo.findById(userId);
    if (!user) throw new NotFoundError(`User ${userId} not found`);

    const existing = this.participantRepo.findByUserAndTanda(userId, tandaId);
    if (existing) throw new ConflictError('User is already a participant in this tanda');

    const count = this.participantRepo.countByTandaId(tandaId);
    if (count >= config.maxParticipants) {
      throw new ValidationError(`Tanda is full (max ${config.maxParticipants} participants)`);
    }

    return this.participantRepo.create({ userId, tandaId, role: 'member' });
  }

  /**
   * Transition a tanda from FORMING to ACTIVE, randomising rotation order.
   * @param tandaId - UUID of the tanda
   * @param requesterId - User ID of the requester (must be organizer)
   * @returns The updated Tanda record
   * @throws {NotFoundError} If tanda not found
   * @throws {ConflictError} If tanda is not in FORMING status
   * @throws {ForbiddenError} If requester is not the organizer
   * @throws {ValidationError} If fewer than minParticipants have joined
   */
  startTanda(tandaId: string, requesterId: string): Tanda {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);

    if (tanda.status !== 'forming') {
      throw new ConflictError(`Cannot start a tanda with status '${tanda.status}'`);
    }
    if (tanda.organizerId !== requesterId) {
      throw new ForbiddenError('Only the organizer can start the tanda');
    }

    const participants = this.participantRepo.findByTandaId(tandaId);
    if (participants.length < config.minParticipants) {
      throw new ValidationError(
        `Need at least ${config.minParticipants} participants to start`,
      );
    }

    const shuffled = shuffle(participants);
    shuffled.forEach((p, index) => {
      this.participantRepo.updateRotationPosition(p.id, index + 1);
    });

    return this.tandaRepo.update(tandaId, {
      status: 'active',
      currentRound: 1,
      totalRounds: participants.length,
    });
  }

  /**
   * Cancel a tanda (organizer only). Works from FORMING or ACTIVE.
   * @param tandaId - UUID of the tanda
   * @param requesterId - User ID of the requester (must be organizer)
   * @returns The updated Tanda record
   * @throws {NotFoundError} If tanda not found
   * @throws {ForbiddenError} If requester is not the organizer
   * @throws {ConflictError} If tanda is already cancelled or completed
   */
  cancelTanda(tandaId: string, requesterId: string): Tanda {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);

    if (tanda.organizerId !== requesterId) {
      throw new ForbiddenError('Only the organizer can cancel the tanda');
    }
    if (tanda.status === 'cancelled' || tanda.status === 'completed') {
      throw new ConflictError(`Cannot cancel a tanda with status '${tanda.status}'`);
    }

    return this.tandaRepo.update(tandaId, {
      status: 'cancelled',
      currentRound: tanda.currentRound,
      totalRounds: tanda.totalRounds,
    });
  }

  /**
   * Advance the current round, recording missed contributions and auto-completing when done.
   * @param tandaId - UUID of the tanda
   * @param requesterId - User ID of the requester (must be organizer)
   * @returns The updated Tanda record
   * @throws {NotFoundError} If tanda not found
   * @throws {ConflictError} If tanda is not ACTIVE
   * @throws {ForbiddenError} If requester is not the organizer
   */
  advanceRound(tandaId: string, requesterId: string): Tanda {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);

    if (tanda.status !== 'active') {
      throw new ConflictError(`Cannot advance a tanda with status '${tanda.status}'`);
    }
    if (tanda.organizerId !== requesterId) {
      throw new ForbiddenError('Only the organizer can advance the round');
    }

    // Mark any non-contributed participants as missed for the current round
    const participants = this.participantRepo.findByTandaId(tandaId);
    for (const participant of participants) {
      const existing = this.contributionRepo.findByParticipantAndRound(
        participant.id,
        tanda.currentRound,
      );
      if (!existing) {
        this.contributionRepo.create({
          tandaId,
          participantId: participant.id,
          round: tanda.currentRound,
          amount: 0,
          status: 'missed',
        });
      }
    }

    const newRound = tanda.currentRound + 1;
    const newStatus = newRound > tanda.totalRounds ? 'completed' : 'active';

    return this.tandaRepo.update(tandaId, {
      status: newStatus,
      currentRound: newRound,
      totalRounds: tanda.totalRounds,
    });
  }

  /**
   * Record a contribution for the current round.
   * @param tandaId - UUID of the tanda
   * @param participantId - UUID of the participant
   * @param amount - Must equal tanda.contributionAmount
   * @returns The created Contribution record
   * @throws {NotFoundError} If tanda or participant not found
   * @throws {UnprocessableError} If tanda is not ACTIVE
   * @throws {ValidationError} If amount does not match or participant is not in this tanda
   * @throws {ConflictError} If participant already contributed this round
   */
  recordContribution(tandaId: string, participantId: string, amount: number): Contribution {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);

    if (tanda.status !== 'active') {
      throw new UnprocessableError(`Tanda is not active (status: '${tanda.status}')`);
    }
    if (amount !== tanda.contributionAmount) {
      throw new ValidationError(
        `Amount must be ${tanda.contributionAmount}, got ${amount}`,
      );
    }

    const participant = this.participantRepo.findById(participantId);
    if (!participant) throw new NotFoundError(`Participant ${participantId} not found`);
    if (participant.tandaId !== tandaId) {
      throw new ValidationError('Participant does not belong to this tanda');
    }

    const existing = this.contributionRepo.findByParticipantAndRound(
      participantId,
      tanda.currentRound,
    );
    if (existing) throw new ConflictError('Participant already contributed this round');

    return this.contributionRepo.create({
      tandaId,
      participantId,
      round: tanda.currentRound,
      amount,
      status: 'paid',
    });
  }

  /**
   * List all participants in a tanda.
   * @param tandaId - UUID of the tanda
   * @returns Array of Participant records
   * @throws {NotFoundError} If tanda not found
   */
  listParticipants(tandaId: string): Participant[] {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);
    return this.participantRepo.findByTandaId(tandaId);
  }

  /**
   * Get a summary of a specific round including contributions and the pot recipient.
   * @param tandaId - UUID of the tanda
   * @param round - Round number (1-based)
   * @returns Round summary with contributions and potRecipient
   * @throws {NotFoundError} If tanda not found
   */
  getRoundSummary(
    tandaId: string,
    round: number,
  ): { round: number; contributions: Contribution[]; potRecipient: Participant | null } {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);

    const contributions = this.contributionRepo.findByTandaAndRound(tandaId, round);
    const participants = this.participantRepo.findByTandaId(tandaId);
    const potRecipient = participants.find((p) => p.rotationPosition === round) ?? null;

    return { round, contributions, potRecipient };
  }

  /**
   * Get the full contribution history for a participant in a tanda.
   * @param tandaId - UUID of the tanda
   * @param participantId - UUID of the participant
   * @returns Array of Contribution records ordered by round
   * @throws {NotFoundError} If tanda or participant not found, or participant is not in this tanda
   */
  getParticipantHistory(tandaId: string, participantId: string): Contribution[] {
    const tanda = this.tandaRepo.findById(tandaId);
    if (!tanda) throw new NotFoundError(`Tanda ${tandaId} not found`);

    const participant = this.participantRepo.findById(participantId);
    if (!participant) throw new NotFoundError(`Participant ${participantId} not found`);
    if (participant.tandaId !== tandaId) {
      throw new NotFoundError('Participant does not belong to this tanda');
    }

    return this.contributionRepo.findByParticipantId(participantId);
  }
}
