import { Tanda, Participant, Contribution } from './tanda.entity.js';
import { ITandaRepository, IParticipantRepository, IContributionRepository } from './tanda.port.js';
import { IUserRepository } from '../users/user.port.js';
import {
  CreateTandaDto,
  JoinTandaDto,
  StartTandaDto,
  CancelTandaDto,
  RecordContributionDto,
  AdvanceRoundDto,
} from './tanda.schema.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
  UnprocessableError,
} from '../../shared/exceptions/index.js';
import { getConfig } from '../../shared/config/index.js';

/**
 * Service for tanda lifecycle and contribution operations.
 * Enforces all business rules; never contains SQL.
 */
export class TandaService {
  /**
   * @param tandaRepo        - Tanda persistence port
   * @param participantRepo  - Participant persistence port
   * @param contributionRepo - Contribution persistence port
   * @param userRepo         - User persistence port (for existence checks)
   */
  constructor(
    private readonly tandaRepo: ITandaRepository,
    private readonly participantRepo: IParticipantRepository,
    private readonly contributionRepo: IContributionRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  // ── UC-001: Organizer creates and starts a tanda ─────────────────────────

  /**
   * Creates a tanda and auto-joins the organizer as first participant.
   * @param dto - Validated creation payload
   * @returns The newly created Tanda
   * @throws NotFoundError if organizerId does not match a known user
   */
  create(dto: CreateTandaDto): Tanda {
    const organizer = this.userRepo.findById(dto.organizerId);
    if (!organizer) throw new NotFoundError(`User '${dto.organizerId}' not found`);

    const tanda = this.tandaRepo.create({
      name: dto.name,
      organizerId: dto.organizerId,
      contributionAmount: dto.contributionAmount,
      status: 'forming',
      currentRound: 0,
      totalRounds: 0,
    });

    this.participantRepo.create({
      userId: dto.organizerId,
      tandaId: tanda.id,
      role: 'organizer',
      rotationPosition: null,
    });

    return tanda;
  }

  /**
   * Returns tandas for a given user.
   * @param userId - UUID of the user
   * @returns Array of Tanda records
   */
  findByUserId(userId: string): Tanda[] {
    return this.tandaRepo.findByUserId(userId);
  }

  /**
   * Returns tanda details by id.
   * @param id - UUID of the tanda
   * @returns The Tanda
   * @throws NotFoundError if not found
   */
  findById(id: string): Tanda {
    const tanda = this.tandaRepo.findById(id);
    if (!tanda) throw new NotFoundError(`Tanda '${id}' not found`);
    return tanda;
  }

  /**
   * Adds a user as a member participant.
   * @param tandaId - UUID of the tanda to join
   * @param dto     - Validated join payload
   * @returns The created Participant record
   * @throws NotFoundError   if tanda or user not found
   * @throws UnprocessableError if tanda is not in FORMING status
   * @throws ConflictError   if user is already a participant
   * @throws ValidationError if the tanda is already at max participants
   */
  join(tandaId: string, dto: JoinTandaDto): Participant {
    const tanda = this.findById(tandaId);
    const user = this.userRepo.findById(dto.userId);
    if (!user) throw new NotFoundError(`User '${dto.userId}' not found`);

    if (tanda.status !== 'forming') {
      throw new UnprocessableError('Can only join a tanda in FORMING status');
    }

    const existing = this.participantRepo.findByUserAndTanda(dto.userId, tandaId);
    if (existing) throw new ConflictError('User is already a participant in this tanda');

    const { maxParticipants } = getConfig();
    const current = this.participantRepo.findByTandaId(tandaId);
    if (current.length >= maxParticipants) {
      throw new ValidationError(`Tanda has reached the maximum of ${maxParticipants} participants`);
    }

    return this.participantRepo.create({
      userId: dto.userId,
      tandaId,
      role: 'member',
      rotationPosition: null,
    });
  }

  /**
   * Returns all participants for a tanda.
   * @param tandaId - UUID of the tanda
   * @returns Array of Participant records
   * @throws NotFoundError if tanda not found
   */
  listParticipants(tandaId: string): Participant[] {
    this.findById(tandaId); // existence check
    return this.participantRepo.findByTandaId(tandaId);
  }

  /**
   * Starts a tanda: randomises rotation order, transitions to ACTIVE.
   * @param tandaId - UUID of the tanda to start
   * @param dto     - Contains the userId of the caller (must be organizer)
   * @returns The updated Tanda (status = active)
   * @throws NotFoundError   if tanda not found
   * @throws ForbiddenError  if caller is not the organizer
   * @throws UnprocessableError if tanda is not FORMING
   * @throws ValidationError if fewer than 3 participants
   */
  start(tandaId: string, dto: StartTandaDto): Tanda {
    const tanda = this.findById(tandaId);

    if (tanda.organizerId !== dto.userId) {
      throw new ForbiddenError('Only the organizer can start the tanda');
    }
    if (tanda.status !== 'forming') {
      throw new UnprocessableError(`Cannot start a tanda with status '${tanda.status}'`);
    }

    const participants = this.participantRepo.findByTandaId(tandaId);
    if (participants.length < 3) {
      throw new ValidationError('A tanda needs at least 3 participants to start');
    }

    // Randomise rotation order (Fisher-Yates)
    const shuffled = [...participants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    const assignments = shuffled.map((p, idx) => ({
      id: p.id,
      rotationPosition: idx + 1,
    }));
    this.participantRepo.assignPositions(assignments);

    return this.tandaRepo.update(tandaId, {
      status: 'active',
      currentRound: 1,
      totalRounds: participants.length,
    });
  }

  /**
   * Cancels a tanda.
   * @param tandaId - UUID of the tanda to cancel
   * @param dto     - Contains the userId of the caller (must be organizer)
   * @returns The updated Tanda (status = cancelled)
   * @throws NotFoundError   if tanda not found
   * @throws ForbiddenError  if caller is not the organizer
   * @throws UnprocessableError if tanda is already completed or cancelled
   */
  cancel(tandaId: string, dto: CancelTandaDto): Tanda {
    const tanda = this.findById(tandaId);

    if (tanda.organizerId !== dto.userId) {
      throw new ForbiddenError('Only the organizer can cancel the tanda');
    }
    if (tanda.status === 'completed' || tanda.status === 'cancelled') {
      throw new UnprocessableError(`Cannot cancel a tanda with status '${tanda.status}'`);
    }

    return this.tandaRepo.update(tandaId, { status: 'cancelled' });
  }

  // ── UC-002: Member records a contribution ───────────────────────────────

  /**
   * Records a contribution for the current round.
   * @param tandaId - UUID of the tanda
   * @param dto     - Validated contribution payload
   * @returns The created Contribution
   * @throws NotFoundError      if tanda or participant not found in this tanda
   * @throws UnprocessableError if tanda is not ACTIVE
   * @throws ValidationError    if amount does not match tanda's contribution amount
   * @throws ConflictError      if participant already contributed this round
   */
  recordContribution(tandaId: string, dto: RecordContributionDto): Contribution {
    const tanda = this.findById(tandaId);
    if (tanda.status !== 'active') {
      throw new UnprocessableError('Can only record contributions for an ACTIVE tanda');
    }

    const participant = this.participantRepo
      .findByTandaId(tandaId)
      .find((p) => p.id === dto.participantId);
    if (!participant) {
      throw new NotFoundError(`Participant '${dto.participantId}' not found in tanda '${tandaId}'`);
    }

    const existing = this.contributionRepo.findByParticipantAndRound(
      dto.participantId,
      tanda.currentRound,
    );
    if (existing) {
      throw new ConflictError('Participant has already contributed this round');
    }

    const { penaltyPercent } = getConfig();
    const isLate = dto.amount < tanda.contributionAmount;
    const expectedWithPenalty = tanda.contributionAmount * (1 + penaltyPercent / 100);
    const isFullWithPenalty = dto.amount >= expectedWithPenalty;

    if (dto.amount !== tanda.contributionAmount && !isFullWithPenalty) {
      throw new ValidationError(
        `Contribution amount must be ${tanda.contributionAmount} (or ${expectedWithPenalty.toFixed(2)} if late)`,
      );
    }

    const status = isLate ? 'late' : 'paid';

    return this.contributionRepo.create({
      tandaId,
      participantId: dto.participantId,
      round: tanda.currentRound,
      amount: dto.amount,
      status,
    });
  }

  /**
   * Returns a round summary for a tanda.
   * @param tandaId - UUID of the tanda
   * @param round   - Round number (1-based)
   * @returns Array of contributions for that round
   * @throws NotFoundError if tanda not found
   */
  getRoundSummary(tandaId: string, round: number): Contribution[] {
    this.findById(tandaId); // existence check
    return this.contributionRepo.findByTandaAndRound(tandaId, round);
  }

  /**
   * Returns contribution history for a specific participant.
   * @param tandaId       - UUID of the tanda
   * @param participantId - UUID of the participant
   * @returns Array of Contribution records ordered by round
   * @throws NotFoundError if tanda or participant not found
   */
  getParticipantHistory(tandaId: string, participantId: string): Contribution[] {
    this.findById(tandaId); // existence check
    const participant = this.participantRepo
      .findByTandaId(tandaId)
      .find((p) => p.id === participantId);
    if (!participant) {
      throw new NotFoundError(`Participant '${participantId}' not found in tanda '${tandaId}'`);
    }
    return this.contributionRepo.findByParticipant(participantId);
  }

  // ── UC-003: Organizer advances round ────────────────────────────────────

  /**
   * Advances to the next round (or completes the tanda after the last round).
   * Missing contributions are marked as 'missed'.
   * @param tandaId - UUID of the tanda
   * @param dto     - Contains the userId of the caller (must be organizer)
   * @returns The updated Tanda
   * @throws NotFoundError   if tanda not found
   * @throws ForbiddenError  if caller is not the organizer
   * @throws UnprocessableError if tanda is not ACTIVE
   */
  advanceRound(tandaId: string, dto: AdvanceRoundDto): Tanda {
    const tanda = this.findById(tandaId);

    if (tanda.organizerId !== dto.userId) {
      throw new ForbiddenError('Only the organizer can advance rounds');
    }
    if (tanda.status !== 'active') {
      throw new UnprocessableError(`Cannot advance a tanda with status '${tanda.status}'`);
    }

    // Mark participants who didn't contribute this round as 'missed'
    const participants = this.participantRepo.findByTandaId(tandaId);
    const contributions = this.contributionRepo.findByTandaAndRound(tandaId, tanda.currentRound);
    const paidSet = new Set(contributions.map((c) => c.participantId));

    for (const p of participants) {
      if (!paidSet.has(p.id)) {
        this.contributionRepo.create({
          tandaId,
          participantId: p.id,
          round: tanda.currentRound,
          amount: 0,
          status: 'missed',
        });
      }
    }

    // Auto-complete or advance
    if (tanda.currentRound >= tanda.totalRounds) {
      return this.tandaRepo.update(tandaId, { status: 'completed' });
    }
    return this.tandaRepo.update(tandaId, { currentRound: tanda.currentRound + 1 });
  }
}

