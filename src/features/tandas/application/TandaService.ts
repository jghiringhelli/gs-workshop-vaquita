import type { AppConfig } from "../../../config/appConfig";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
} from "../../../shared/errors/AppError";
import type { UserRepository } from "../../users/domain/UserRepository";
  import type {
    AdvanceRoundInput,
    CancelTandaInput,
    Contribution,
    CreateTandaInput,
    JoinTandaInput,
    NextRecipientPreview,
    Participant,
    ParticipantHistory,
    RecordContributionInput,
    RoundSummary,
    StartTandaInput,
  Tanda,
  TandaDetail,
} from "../domain/TandaModels";
import type { RotationAssignment, TandaRepository } from "../domain/TandaRepository";
import {
  calculateLatePenalty,
  countConsecutiveMisses,
  createPendingContribution,
  isContributionLate,
  shuffleParticipants,
} from "../domain/tandaRules";

type TandaServiceConfig = Pick<
  AppConfig,
  "contributionWindowDays" | "latePenaltyBasisPoints" | "maxParticipants" | "minParticipantsToStart"
>;

export interface TandaServiceDependencies {
  readonly tandaRepository: TandaRepository;
  readonly userRepository: UserRepository;
  readonly config: TandaServiceConfig;
  readonly now?: () => Date;
  readonly random?: () => number;
}

/**
 * Coordinate Tanda lifecycle, contributions, and round logic.
 */
export class TandaService {
  private readonly now: () => Date;
  private readonly random: () => number;

  public constructor(private readonly dependencies: TandaServiceDependencies) {
    this.now = dependencies.now ?? (() : Date => new Date());
    this.random = dependencies.random ?? (() : number => Math.random());
  }

  /**
   * Create a tanda and auto-join its organizer.
   *
   * @param input The tanda creation payload.
   * @returns The created tanda detail.
   */
  public createTanda(input: CreateTandaInput): TandaDetail {
    this.ensureUserExists(input.organizerId);
    if (input.contributionAmount <= 0) {
      throw new BadRequestError("Contribution amount must be greater than zero");
    }

    const timestamp = this.getTimestamp();
    return this.dependencies.tandaRepository.runInTransaction(() => {
      const tanda = this.dependencies.tandaRepository.createTanda({
        ...input,
        now: timestamp,
        totalRounds: 1,
      });

      this.dependencies.tandaRepository.addParticipant({
        tandaId: tanda.id,
        userId: input.organizerId,
        role: "organizer",
        joinedAt: timestamp,
      });

      return this.getTandaDetail(tanda.id);
    });
  }

  /**
   * List the tandas that belong to a user.
   *
   * @param userId The user identifier.
   * @returns The tandas visible to that user.
   */
  public listTandasForUser(userId: number): readonly Tanda[] {
    this.ensureUserExists(userId);
    return this.dependencies.tandaRepository.listTandasForUser(userId);
  }

  /**
   * Return the detail view for a tanda.
   *
   * @param tandaId The tanda identifier.
   * @returns The tanda detail.
   */
  public getTandaById(tandaId: number): TandaDetail {
    return this.getTandaDetail(tandaId);
  }

  /**
   * Join a forming tanda as a member.
   *
   * @param input The join request payload.
   * @returns The created participant.
   */
  public joinTanda(input: JoinTandaInput): Participant {
    this.ensureUserExists(input.userId);

    const tanda = this.getTandaOrThrow(input.tandaId);
    if (tanda.status !== "forming") {
      throw new ConflictError("Only forming tandas accept new participants");
    }

    if (tanda.participantCount >= this.dependencies.config.maxParticipants) {
      throw new BadRequestError(
        `A tanda cannot have more than ${this.dependencies.config.maxParticipants} participants`,
      );
    }

    const existingParticipant = this.dependencies.tandaRepository.getParticipantByUserId(tanda.id, input.userId);
    if (existingParticipant) {
      throw new ConflictError(`User ${input.userId} is already part of this tanda`);
    }

    const timestamp = this.getTimestamp();
    return this.dependencies.tandaRepository.runInTransaction(() => {
      const participant = this.dependencies.tandaRepository.addParticipant({
        tandaId: tanda.id,
        userId: input.userId,
        role: "member",
        joinedAt: timestamp,
      });

      const refreshedTanda = this.getTandaOrThrow(tanda.id);
      this.dependencies.tandaRepository.saveTandaState({
        ...refreshedTanda,
        totalRounds: refreshedTanda.participantCount,
        updatedAt: timestamp,
      });

      return this.getParticipantOrThrow(tanda.id, participant.id);
    });
  }

  /**
   * Return the participants of a tanda.
   *
   * @param tandaId The tanda identifier.
   * @returns The tanda participants.
   */
  public listParticipants(tandaId: number): readonly Participant[] {
    this.getTandaOrThrow(tandaId);
    return this.dependencies.tandaRepository.listParticipants(tandaId);
  }

  /**
   * Return the current upcoming pot recipient for a tanda.
   *
   * @param tandaId The tanda identifier.
   * @returns The next-recipient preview.
   */
  public getNextRecipient(tandaId: number): NextRecipientPreview {
    const tanda = this.getTandaOrThrow(tandaId);
    if (tanda.status !== "active") {
      return {
        tandaId,
        status: tanda.status,
        round: null,
        recipient: null,
      };
    }

    const participants = this.dependencies.tandaRepository.listParticipants(tandaId);
    return {
      tandaId,
      status: tanda.status,
      round: tanda.currentRound,
      recipient: participants.find((participant) => participant.rotationPosition === tanda.currentRound) ?? null,
    };
  }

  /**
   * Start a forming tanda and lock a randomized rotation order.
   *
   * @param input The start request payload.
   * @returns The updated tanda detail.
   */
  public startTanda(input: StartTandaInput): TandaDetail {
    const tanda = this.getTandaOrThrow(input.tandaId);
    if (tanda.status !== "forming") {
      throw new ConflictError("Only forming tandas can be started");
    }

    this.assertOrganizer(tanda.id, input.requesterUserId);
    const participants = this.dependencies.tandaRepository.listParticipants(tanda.id);
    if (participants.length < this.dependencies.config.minParticipantsToStart) {
      throw new BadRequestError(
        `A tanda needs at least ${this.dependencies.config.minParticipantsToStart} participants to start`,
      );
    }

    const timestamp = this.getTimestamp();
    const shuffledParticipants = shuffleParticipants(participants, this.random);
    const assignments: readonly RotationAssignment[] = shuffledParticipants.map((participant, index) => ({
      participantId: participant.id,
      rotationPosition: index + 1,
    }));

    return this.dependencies.tandaRepository.runInTransaction(() => {
      this.dependencies.tandaRepository.assignRotationPositions(tanda.id, assignments);

      const refreshedTanda = this.getTandaOrThrow(tanda.id);
      this.dependencies.tandaRepository.saveTandaState({
        ...refreshedTanda,
        status: "active",
        currentRound: 1,
        totalRounds: participants.length,
        updatedAt: timestamp,
        startedAt: refreshedTanda.startedAt ?? timestamp,
        roundStartedAt: timestamp,
      });

      return this.getTandaDetail(tanda.id);
    });
  }

  /**
   * Cancel a tanda as its organizer.
   *
   * @param input The cancel request payload.
   * @returns The updated tanda detail.
   */
  public cancelTanda(input: CancelTandaInput): TandaDetail {
    const tanda = this.getTandaOrThrow(input.tandaId);
    if (tanda.status !== "forming" && tanda.status !== "active") {
      throw new ConflictError("Only forming or active tandas can be cancelled");
    }

    this.assertOrganizer(tanda.id, input.requesterUserId);
    const timestamp = this.getTimestamp();

    return this.dependencies.tandaRepository.runInTransaction(() => {
      this.dependencies.tandaRepository.saveTandaState({
        ...tanda,
        status: "cancelled",
        updatedAt: timestamp,
        cancelledAt: timestamp,
      });

      return this.getTandaDetail(tanda.id);
    });
  }

  /**
   * Record a contribution for the current active round.
   *
   * @param input The contribution payload.
   * @returns The stored contribution.
   */
  public recordContribution(input: RecordContributionInput): Contribution {
    const tanda = this.getTandaOrThrow(input.tandaId);
    if (tanda.status !== "active") {
      throw new UnprocessableEntityError("Contributions can only be recorded for active tandas");
    }

    if (input.amount !== tanda.contributionAmount) {
      throw new BadRequestError(`Contribution amount must match ${tanda.contributionAmount}`);
    }

    const participant = this.getParticipantOrThrow(tanda.id, input.participantId);
    const existingContribution = this.dependencies.tandaRepository.getContribution(
      tanda.id,
      participant.id,
      tanda.currentRound,
    );
    if (existingContribution) {
      throw new ConflictError(`Participant ${participant.id} already contributed in round ${tanda.currentRound}`);
    }

    const recordedAt = this.getTimestamp();
    const contributionIsLate = isContributionLate(
      tanda.roundStartedAt,
      recordedAt,
      this.dependencies.config.contributionWindowDays,
    );

    return this.dependencies.tandaRepository.createContribution({
      tandaId: tanda.id,
      participantId: participant.id,
      round: tanda.currentRound,
      amount: input.amount,
      status: contributionIsLate ? "late" : "paid",
      penaltyAmount: contributionIsLate
        ? calculateLatePenalty(input.amount, this.dependencies.config.latePenaltyBasisPoints)
        : 0,
      recordedAt,
    });
  }

  /**
   * Return the summary for a tanda round.
   *
   * @param tandaId The tanda identifier.
   * @param round The round number.
   * @returns The round summary.
   */
  public getRoundSummary(tandaId: number, round: number): RoundSummary {
    const tanda = this.getTandaOrThrow(tandaId);
    if (round < 1 || round > tanda.totalRounds) {
      throw new NotFoundError(`Round ${round} was not found for tanda ${tandaId}`);
    }

    const participants = this.dependencies.tandaRepository.listParticipants(tandaId);
    const recordedContributions = this.dependencies.tandaRepository.listContributionsForRound(tandaId, round);
    const recordedByParticipantId = new Map(recordedContributions.map((contribution) => [contribution.participantId, contribution]));
    const contributions = participants.map(
      (participant) =>
        recordedByParticipantId.get(participant.id) ??
        createPendingContribution(participant, tandaId, round, tanda.contributionAmount),
    );

    const totalCollected = contributions
      .filter((contribution) => contribution.status === "paid" || contribution.status === "late")
      .reduce((sum, contribution) => sum + contribution.amount, 0);

    return {
      tandaId,
      round,
      status: tanda.status,
      recipient: participants.find((participant) => participant.rotationPosition === round) ?? null,
      totalCollected,
      expectedTotal: participants.length * tanda.contributionAmount,
      contributions,
    };
  }

  /**
   * Advance an active tanda to the next round or complete it after the last round.
   *
   * @param input The advance request payload.
   * @returns The updated tanda detail.
   */
  public advanceRound(input: AdvanceRoundInput): TandaDetail {
    const tanda = this.getTandaOrThrow(input.tandaId);
    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new ConflictError("Completed or cancelled tandas cannot advance");
    }

    if (tanda.status !== "active") {
      throw new UnprocessableEntityError("Only active tandas can advance rounds");
    }

    this.assertOrganizer(tanda.id, input.requesterUserId);
    const timestamp = this.getTimestamp();

    return this.dependencies.tandaRepository.runInTransaction(() => {
      this.ensureRoundIsFullyRecorded(tanda, timestamp);
      this.updateDefaulterFlags(tanda.id);

      const refreshedTanda = this.getTandaOrThrow(tanda.id);
      if (refreshedTanda.currentRound >= refreshedTanda.totalRounds) {
        this.dependencies.tandaRepository.saveTandaState({
          ...refreshedTanda,
          status: "completed",
          updatedAt: timestamp,
          completedAt: timestamp,
        });

        return this.getTandaDetail(tanda.id);
      }

      this.dependencies.tandaRepository.saveTandaState({
        ...refreshedTanda,
        currentRound: refreshedTanda.currentRound + 1,
        updatedAt: timestamp,
        roundStartedAt: timestamp,
      });

      return this.getTandaDetail(tanda.id);
    });
  }

  /**
   * Return contribution history for a participant in a tanda.
   *
   * @param tandaId The tanda identifier.
   * @param participantId The participant identifier.
   * @returns The participant contribution history.
   */
  public getParticipantHistory(tandaId: number, participantId: number): ParticipantHistory {
    this.getTandaOrThrow(tandaId);
    const participant = this.getParticipantOrThrow(tandaId, participantId);

    return {
      tandaId,
      participant,
      history: this.dependencies.tandaRepository.listContributionHistory(participantId),
    };
  }

  private ensureUserExists(userId: number): void {
    const user = this.dependencies.userRepository.getById(userId);
    if (!user) {
      throw new NotFoundError(`User ${userId} was not found`);
    }
  }

  private getTimestamp(): string {
    return this.now().toISOString();
  }

  private getTandaOrThrow(tandaId: number): Tanda {
    const tanda = this.dependencies.tandaRepository.getTandaById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda ${tandaId} was not found`);
    }

    return tanda;
  }

  private getParticipantOrThrow(tandaId: number, participantId: number): Participant {
    const participant = this.dependencies.tandaRepository.getParticipantById(tandaId, participantId);
    if (!participant) {
      throw new NotFoundError(`Participant ${participantId} was not found in tanda ${tandaId}`);
    }

    return participant;
  }

  private assertOrganizer(tandaId: number, requesterUserId: number): Participant {
    const participant = this.dependencies.tandaRepository.getParticipantByUserId(tandaId, requesterUserId);
    if (!participant || participant.role !== "organizer") {
      throw new ForbiddenError("Only the organizer can perform this action");
    }

    return participant;
  }

  private getTandaDetail(tandaId: number): TandaDetail {
    const tanda = this.getTandaOrThrow(tandaId);
    return {
      ...tanda,
      participants: this.dependencies.tandaRepository.listParticipants(tandaId),
    };
  }

  private ensureRoundIsFullyRecorded(tanda: Tanda, recordedAt: string): void {
    const participants = this.dependencies.tandaRepository.listParticipants(tanda.id);
    const contributions = this.dependencies.tandaRepository.listContributionsForRound(tanda.id, tanda.currentRound);
    const contributorIds = new Set(contributions.map((contribution) => contribution.participantId));

    for (const participant of participants) {
      if (contributorIds.has(participant.id)) {
        continue;
      }

      this.dependencies.tandaRepository.createContribution({
        tandaId: tanda.id,
        participantId: participant.id,
        round: tanda.currentRound,
        amount: tanda.contributionAmount,
        status: "missed",
        penaltyAmount: 0,
        recordedAt,
      });
    }
  }

  private updateDefaulterFlags(tandaId: number): void {
    const participants = this.dependencies.tandaRepository.listParticipants(tandaId);

    for (const participant of participants) {
      const recentStatuses = this.dependencies.tandaRepository.listRecentContributionStatuses(participant.id, 2);
      const isDefaulter = countConsecutiveMisses(recentStatuses) >= 2;
      this.dependencies.tandaRepository.setParticipantDefaulter(participant.id, isDefaulter);
    }
  }
}
