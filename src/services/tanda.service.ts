import { EnvironmentConfig } from "../config/env";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../errors/app-error";
import { Contribution, Participant, Tanda } from "../domain/types";
import {
  ContributionRepository,
  CreateContributionInput,
} from "../repositories/contribution.repository";
import { ParticipantRepository } from "../repositories/participant.repository";
import {
  CreateTandaInput,
  TandaRepository,
  UpdateTandaLifecycleInput,
} from "../repositories/tanda.repository";
import { UserRepository } from "../repositories/user.repository";

interface RoundSummary {
  tandaId: number;
  round: number;
  expectedAmount: number;
  collectedAmount: number;
  recipientParticipantId: number | null;
  contributions: ReturnType<ContributionRepository["listByTandaAndRound"]>;
}

interface RecordContributionInput {
  tandaId: number;
  userId: number;
  idempotencyKey?: string;
}

type ExistingTanda = NonNullable<ReturnType<TandaRepository["findById"]>>;

export class TandaService {
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly tandaRepository: TandaRepository,
    private readonly participantRepository: ParticipantRepository,
    private readonly contributionRepository: ContributionRepository,
    private readonly config: EnvironmentConfig,
  ) {}

  /**
   * Creates a tanda and auto-registers organizer as participant.
   * @param input Tanda creation payload.
   * @returns Created tanda.
   */
  public createTanda(input: CreateTandaInput): Tanda {
    const organizer = this.userRepository.findById(input.organizerId);
    if (!organizer) {
      throw new NotFoundError("Organizer not found");
    }

    if (!Number.isInteger(input.contributionAmount) || input.contributionAmount <= 0) {
      throw new ValidationError("Contribution amount must be a positive integer");
    }

    const tanda = this.tandaRepository.create(input);
    this.participantRepository.create({
      userId: input.organizerId,
      tandaId: tanda.id,
      role: "organizer",
    });
    return this.getById(tanda.id);
  }

  /**
   * Lists tandas where the user participates.
   * @param userId User identifier.
   * @returns Tanda list.
   */
  public listByUser(userId: number): Tanda[] {
    return this.tandaRepository.listByUserId(userId);
  }

  /**
   * Gets tanda by identifier.
   * @param tandaId Tanda identifier.
   * @returns Existing tanda.
   */
  public getById(tandaId: number): Tanda {
    const tanda = this.tandaRepository.findById(tandaId);
    if (!tanda) {
      throw new NotFoundError("Tanda not found");
    }
    return tanda;
  }

  /**
   * Joins a user to a forming tanda.
   * @param tandaId Tanda identifier.
   * @param userId User identifier.
   * @returns Created participant row.
   */
  public join(tandaId: number, userId: number): Participant {
    const tanda = this.getById(tandaId);
    this.ensureStatus(tanda.status, ["forming"], "Tanda is not accepting new members");

    if (!this.userRepository.findById(userId)) {
      throw new NotFoundError("User not found");
    }

    const participants = this.participantRepository.listByTandaId(tandaId);
    if (participants.length >= this.config.MAX_PARTICIPANTS) {
      throw new ConflictError("Maximum participants reached");
    }

    if (this.participantRepository.findByTandaAndUser(tandaId, userId)) {
      throw new ConflictError("User already joined this tanda");
    }

    return this.participantRepository.create({
      userId,
      tandaId,
      role: "member",
    });
  }

  /**
   * Starts a forming tanda and locks randomized rotation.
   * @param tandaId Tanda identifier.
   * @param requesterUserId Authenticated requester.
   * @returns Updated tanda.
   */
  public start(tandaId: number, requesterUserId: number): Tanda {
    const tanda = this.getById(tandaId);
    this.ensureOrganizer(tanda.organizerId, requesterUserId);
    this.ensureStatus(tanda.status, ["forming"], "Only forming tandas can start");

    const participants = this.participantRepository.listByTandaId(tandaId);
    if (participants.length < 3) {
      throw new ValidationError("A tanda needs at least 3 participants to start");
    }

    this.randomizeRotation(participants.map((participant) => participant.id));

    this.tandaRepository.updateLifecycle(tandaId, {
      status: "active",
      currentRound: 1,
      totalRounds: participants.length,
      roundStartedAt: new Date().toISOString(),
    });
    return this.getById(tandaId);
  }

  /**
   * Cancels a tanda.
   * @param tandaId Tanda identifier.
   * @param requesterUserId Authenticated requester.
   * @returns Updated tanda.
   */
  public cancel(tandaId: number, requesterUserId: number): Tanda {
    const tanda = this.getById(tandaId);
    this.ensureOrganizer(tanda.organizerId, requesterUserId);
    this.ensureStatus(tanda.status, ["forming", "active"], "Tanda cannot be cancelled");

    this.tandaRepository.updateLifecycle(tandaId, {
      status: "cancelled",
      currentRound: tanda.currentRound,
      totalRounds: tanda.totalRounds,
      roundStartedAt: tanda.roundStartedAt,
    });
    return this.getById(tandaId);
  }

  /**
   * Lists participants in one tanda.
   * @param tandaId Tanda identifier.
   * @returns Participant list.
   */
  public listParticipants(tandaId: number): Participant[] {
    this.getById(tandaId);
    return this.participantRepository.listByTandaId(tandaId);
  }

  /**
   * Records contribution for current round.
   * @param input Contribution command payload.
   * @returns Created or existing contribution.
   */
  public recordContribution(input: RecordContributionInput): Contribution {
    const tanda = this.getById(input.tandaId);
    this.ensureStatus(tanda.status, ["active"], "Contributions are only allowed on active tandas");

    const participant = this.participantRepository.findByTandaAndUser(input.tandaId, input.userId);
    if (!participant) {
      throw new ForbiddenError("Only participants can contribute");
    }

    if (input.idempotencyKey) {
      const existingContribution = this.contributionRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existingContribution) {
        return existingContribution;
      }
    }

    const existingRoundContribution = this.contributionRepository.findByRoundAndParticipant(
      input.tandaId,
      tanda.currentRound,
      participant.id,
    );
    if (existingRoundContribution) {
      throw new ConflictError("Contribution already recorded for this round");
    }

    const contributionPayload = this.buildContributionPayload(tanda, participant.id, input.idempotencyKey);
    const contribution = this.contributionRepository.create(contributionPayload);
    this.refreshMissedState(participant.id);
    return contribution;
  }

  /**
   * Advances one round and auto-completes when final round ends.
   * @param tandaId Tanda identifier.
   * @param requesterUserId Authenticated requester.
   * @returns Updated tanda.
   */
  public advance(tandaId: number, requesterUserId: number): Tanda {
    const tanda = this.getById(tandaId);
    this.ensureOrganizer(tanda.organizerId, requesterUserId);
    this.ensureStatus(tanda.status, ["active"], "Only active tandas can advance rounds");

    const participants = this.participantRepository.listByTandaId(tandaId);
    for (const participant of participants) {
      const contribution = this.contributionRepository.findByRoundAndParticipant(
        tandaId,
        tanda.currentRound,
        participant.id,
      );

      if (!contribution) {
        this.contributionRepository.create({
          tandaId,
          participantId: participant.id,
          round: tanda.currentRound,
          amount: tanda.contributionAmount,
          status: "missed",
          penaltyAmount: 0,
          idempotencyKey: null,
        });
      }

      this.refreshMissedState(participant.id);
    }

    if (tanda.currentRound >= tanda.totalRounds) {
      this.tandaRepository.updateLifecycle(tandaId, {
        status: "completed",
        currentRound: tanda.currentRound,
        totalRounds: tanda.totalRounds,
        roundStartedAt: tanda.roundStartedAt,
      });
      return this.getById(tandaId);
    }

    const nextLifecycle: UpdateTandaLifecycleInput = {
      status: "active",
      currentRound: tanda.currentRound + 1,
      totalRounds: tanda.totalRounds,
      roundStartedAt: new Date().toISOString(),
    };
    this.tandaRepository.updateLifecycle(tandaId, nextLifecycle);
    return this.getById(tandaId);
  }

  /**
   * Returns summary metrics for one tanda round.
   * @param tandaId Tanda identifier.
   * @param round Round number.
   * @returns Round summary.
   */
  public getRoundSummary(tandaId: number, round: number): RoundSummary {
    const tanda = this.getById(tandaId);
    const participants = this.participantRepository.listByTandaId(tandaId);
    const contributions = this.contributionRepository.listByTandaAndRound(tandaId, round);
    const recipient = participants.find((participant) => participant.rotationPosition === round) ?? null;
    const collectedAmount = contributions.reduce(
      (total, contribution) => total + contribution.amount + contribution.penaltyAmount,
      0,
    );

    return {
      tandaId,
      round,
      expectedAmount: participants.length * tanda.contributionAmount,
      collectedAmount,
      recipientParticipantId: recipient?.id ?? null,
      contributions,
    };
  }

  /**
   * Returns contribution history for one participant within a tanda.
   * @param tandaId Tanda identifier.
   * @param participantId Participant identifier.
   * @returns Contribution history.
   */
  public getParticipantHistory(tandaId: number, participantId: number): Contribution[] {
    const participant = this.participantRepository.findById(participantId);
    if (!participant || participant.tandaId !== tandaId) {
      throw new NotFoundError("Participant not found in this tanda");
    }

    return this.contributionRepository.listByParticipant(participantId);
  }

  /**
   * Ensures requester is tanda organizer.
   * @param organizerId Organizer user id.
   * @param requesterUserId Requester user id.
   * @returns Nothing.
   */
  private ensureOrganizer(organizerId: number, requesterUserId: number): void {
    if (organizerId !== requesterUserId) {
      throw new ForbiddenError("Only organizer can perform this action");
    }
  }

  /**
   * Ensures status is part of allowed set.
   * @param status Current tanda status.
   * @param allowedStatuses Allowed statuses.
   * @param message Error message when status is invalid.
   * @returns Nothing.
   */
  private ensureStatus(
    status: string,
    allowedStatuses: ReadonlyArray<string>,
    message: string,
  ): void {
    if (!allowedStatuses.includes(status)) {
      throw new ValidationError(message);
    }
  }

  /**
   * Randomly assigns participant rotation positions.
   * @param participantIds Participant identifiers.
   * @returns Nothing.
   */
  private randomizeRotation(participantIds: number[]): void {
    const shuffledIdentifiers = [...participantIds];

    for (let index = shuffledIdentifiers.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const swapValue = shuffledIdentifiers[index];
      shuffledIdentifiers[index] = shuffledIdentifiers[swapIndex] as number;
      shuffledIdentifiers[swapIndex] = swapValue as number;
    }

    for (let index = 0; index < shuffledIdentifiers.length; index += 1) {
      this.participantRepository.assignRotationPosition(
        shuffledIdentifiers[index] as number,
        index + 1,
      );
    }
  }

  /**
   * Builds contribution payload applying late penalty when outside window.
   * @param tanda Current tanda.
   * @param participantId Participant identifier.
   * @param idempotencyKey Optional idempotency key.
   * @returns Contribution payload.
   */
  private buildContributionPayload(
    tanda: ExistingTanda,
    participantId: number,
    idempotencyKey?: string,
  ): CreateContributionInput {
    const roundStartedAt = tanda.roundStartedAt ? new Date(tanda.roundStartedAt) : new Date();
    const windowEndsAt = new Date(roundStartedAt.getTime());
    windowEndsAt.setDate(windowEndsAt.getDate() + this.config.ROUND_WINDOW_DAYS);

    const isLate = Date.now() > windowEndsAt.getTime();
    const penaltyAmount = isLate
      ? Math.floor((tanda.contributionAmount * this.config.LATE_PENALTY_PERCENT) / 100)
      : 0;

    return {
      tandaId: tanda.id,
      participantId,
      round: tanda.currentRound,
      amount: tanda.contributionAmount,
      status: isLate ? "late" : "paid",
      penaltyAmount,
      idempotencyKey: idempotencyKey ?? null,
    };
  }

  /**
   * Recomputes participant missed streak and defaulter flag from contribution history.
   * @param participantId Participant identifier.
   * @returns Nothing.
   */
  private refreshMissedState(participantId: number): void {
    const history = this.contributionRepository.listByParticipant(participantId);
    const ordered = [...history].sort((left, right) => right.round - left.round || right.id - left.id);

    let missedStreak = 0;
    for (const contribution of ordered) {
      if (contribution.status !== "missed") {
        break;
      }
      missedStreak += 1;
    }

    this.participantRepository.updateMissedState(participantId, missedStreak, missedStreak >= 2);
  }
}
