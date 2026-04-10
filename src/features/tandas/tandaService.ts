import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
  ValidationError,
} from "../../shared/errors";
import type { UserRepository } from "../users/userRepository";
import type { Contribution, Participant, RoundContribution, RoundSummary, Tanda } from "./tandaTypes";
import type { CreateTandaInput } from "./tandaTypes";
import type { TandaRepository } from "./tandaRepository";

/**
 * Runtime rules used by the tanda service.
 */
export interface TandaRules {
  readonly minParticipantsToStart: number;
  readonly maxParticipantsPerTanda: number;
  readonly latePenaltyPercent: number;
  readonly contributionWindowHours: number;
}

/**
 * Application service for tanda workflows.
 */
export class TandaService {
  /**
   * Create a service instance.
   *
   * @param tandaRepository Tanda repository dependency.
   * @param userRepository User repository dependency.
   * @param rules Runtime business rules.
   */
  public constructor(
    private readonly tandaRepository: TandaRepository,
    private readonly userRepository: UserRepository,
    private readonly rules: TandaRules,
  ) {}

  /**
   * Create a tanda and auto-join the organizer.
   *
   * @param input Tanda creation input.
   * @returns Created tanda.
   */
  public createTanda(input: CreateTandaInput): Tanda {
    this.ensureUserExists(input.organizerId);
    const createdAt = new Date().toISOString();

    return this.tandaRepository.runInTransaction(() => {
      const tanda = this.tandaRepository.createTanda({
        ...input,
        status: "forming",
        currentRound: 1,
        totalRounds: 1,
        createdAt,
        startedAt: null,
        currentRoundStartedAt: createdAt,
        cancelledAt: null,
        completedAt: null,
      });

      this.tandaRepository.createParticipant({
        userId: input.organizerId,
        tandaId: tanda.id,
        role: "organizer",
        rotationPosition: null,
        isDefaulter: false,
        joinedAt: createdAt,
      });

      return tanda;
    });
  }

  /**
   * List tandas for a user.
   *
   * @param userId User identifier.
   * @returns Matching tandas.
   */
  public listTandasForUser(userId: number): ReadonlyArray<Tanda> {
    this.ensureUserExists(userId);
    return this.tandaRepository.listTandasForUser(userId);
  }

  /**
   * Get a tanda by identifier.
   *
   * @param tandaId Tanda identifier.
   * @returns Matching tanda.
   */
  public getTandaById(tandaId: number): Tanda {
    return this.requireTanda(tandaId);
  }

  /**
   * Join a forming tanda.
   *
   * @param tandaId Tanda identifier.
   * @param userId Joining user identifier.
   * @returns Created participant.
   */
  public joinTanda(tandaId: number, userId: number): Participant {
    const tanda = this.requireTanda(tandaId);
    this.ensureUserExists(userId);
    if (tanda.status !== "forming") {
      throw new UnprocessableEntityError("Only forming tandas can be joined");
    }

    if (this.tandaRepository.findParticipantByUserId(tandaId, userId)) {
      throw new ConflictError("User already joined this tanda");
    }

    const participants = this.tandaRepository.listParticipants(tandaId);
    if (participants.length >= this.rules.maxParticipantsPerTanda) {
      throw new ConflictError("Tanda already has the maximum number of participants");
    }

    return this.tandaRepository.runInTransaction(() => {
      const participant = this.tandaRepository.createParticipant({
        userId,
        tandaId,
        role: "member",
        rotationPosition: null,
        isDefaulter: false,
        joinedAt: new Date().toISOString(),
      });
      this.tandaRepository.updateTanda({
        id: tanda.id,
        status: tanda.status,
        currentRound: tanda.currentRound,
        totalRounds: participants.length + 1,
        startedAt: tanda.startedAt,
        currentRoundStartedAt: tanda.currentRoundStartedAt,
        cancelledAt: tanda.cancelledAt,
        completedAt: tanda.completedAt,
      });
      return participant;
    });
  }

  /**
   * List participants for a tanda.
   *
   * @param tandaId Tanda identifier.
   * @returns Ordered participants.
   */
  public listParticipants(tandaId: number): ReadonlyArray<Participant> {
    this.requireTanda(tandaId);
    return this.tandaRepository.listParticipants(tandaId);
  }

  /**
   * Start a tanda and lock the rotation order.
   *
   * @param tandaId Tanda identifier.
   * @param organizerId Organizer identifier.
   * @returns Updated tanda.
   */
  public startTanda(tandaId: number, organizerId: number): Tanda {
    const tanda = this.requireTanda(tandaId);
    this.assertOrganizer(tanda, organizerId);
    if (tanda.status !== "forming") {
      throw new ConflictError("Only forming tandas can be started");
    }

    const participants = this.tandaRepository.listParticipants(tandaId);
    if (participants.length < this.rules.minParticipantsToStart) {
      throw new ValidationError("At least three participants are required to start a tanda");
    }

    return this.tandaRepository.runInTransaction(() => {
      assignRotationPositions(this.tandaRepository, participants);
      const timestamp = new Date().toISOString();
      return this.tandaRepository.updateTanda({
        id: tanda.id,
        status: "active",
        currentRound: 1,
        totalRounds: participants.length,
        startedAt: timestamp,
        currentRoundStartedAt: timestamp,
        cancelledAt: null,
        completedAt: null,
      });
    });
  }

  /**
   * Cancel a tanda.
   *
   * @param tandaId Tanda identifier.
   * @param organizerId Organizer identifier.
   * @returns Updated tanda.
   */
  public cancelTanda(tandaId: number, organizerId: number): Tanda {
    const tanda = this.requireTanda(tandaId);
    this.assertOrganizer(tanda, organizerId);
    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new ConflictError("Completed or cancelled tandas cannot be cancelled again");
    }

    return this.tandaRepository.updateTanda({
      id: tanda.id,
      status: "cancelled",
      currentRound: tanda.currentRound,
      totalRounds: tanda.totalRounds,
      startedAt: tanda.startedAt,
      currentRoundStartedAt: tanda.currentRoundStartedAt,
      cancelledAt: new Date().toISOString(),
      completedAt: tanda.completedAt,
    });
  }

  /**
   * Record a contribution for the current round.
   *
   * @param tandaId Tanda identifier.
   * @param participantId Participant identifier.
   * @param amount Contribution amount in minor units.
   * @param recordedAt Optional timestamp override.
   * @returns Created contribution.
   */
  public recordContribution(
    tandaId: number,
    participantId: number,
    amount: number,
    recordedAt?: string,
  ): Contribution {
    const tanda = this.requireTanda(tandaId);
    if (tanda.status !== "active") {
      throw new UnprocessableEntityError("Contributions can only be recorded for active tandas");
    }

    const participant = this.requireParticipant(participantId, tandaId);
    if (amount !== tanda.contributionAmount) {
      throw new ValidationError("Contribution amount must match the tanda contribution amount");
    }

    if (this.tandaRepository.findContributionByParticipantAndRound(participant.id, tanda.currentRound)) {
      throw new ConflictError("Participant already contributed in the current round");
    }

    const contributionTimestamp = recordedAt ?? new Date().toISOString();
    const isLate = isAfterContributionWindow(
      tanda.currentRoundStartedAt,
      contributionTimestamp,
      this.rules.contributionWindowHours,
    );

    return this.tandaRepository.createContribution({
      tandaId,
      participantId,
      round: tanda.currentRound,
      amount,
      status: isLate ? "late" : "paid",
      penaltyAmount: isLate ? calculatePenaltyAmount(amount, this.rules.latePenaltyPercent) : 0,
      createdAt: contributionTimestamp,
    });
  }

  /**
   * Get the summary for a tanda round.
   *
   * @param tandaId Tanda identifier.
   * @param round Round number.
   * @returns Round summary.
   */
  public getRoundSummary(tandaId: number, round: number): RoundSummary {
    const tanda = this.requireTanda(tandaId);
    if (round < 1 || round > tanda.totalRounds) {
      throw new NotFoundError(`Round ${round} was not found for tanda ${tandaId}`);
    }

    const participants = this.tandaRepository.listParticipants(tandaId);
    const storedContributions = this.tandaRepository.listContributionsForRound(tandaId, round);
    const contributions = buildRoundContributions(participants, storedContributions);
    const recipientParticipantId = participants.find(
      participant => participant.rotationPosition === round,
    )?.id ?? null;

    return {
      tandaId,
      round,
      recipientParticipantId,
      contributions,
      expectedAmount: participants.length * tanda.contributionAmount,
      collectedAmount: contributions.reduce((total, contribution) => total + contribution.amount, 0),
      penaltyAmount: contributions.reduce((total, contribution) => total + contribution.penaltyAmount, 0),
    };
  }

  /**
   * Advance the tanda to the next round or complete it.
   *
   * @param tandaId Tanda identifier.
   * @param organizerId Organizer identifier.
   * @returns Updated tanda.
   */
  public advanceRound(tandaId: number, organizerId: number): Tanda {
    const tanda = this.requireTanda(tandaId);
    this.assertOrganizer(tanda, organizerId);
    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new ConflictError("Completed or cancelled tandas cannot be advanced");
    }

    if (tanda.status !== "active") {
      throw new UnprocessableEntityError("Only active tandas can be advanced");
    }

    return this.tandaRepository.runInTransaction(() => {
      const participants = this.tandaRepository.listParticipants(tandaId);
      markMissedContributions(this.tandaRepository, tanda, participants);
      updateDefaulters(this.tandaRepository, tandaId, participants);

      if (tanda.currentRound >= tanda.totalRounds) {
        return this.tandaRepository.updateTanda({
          id: tanda.id,
          status: "completed",
          currentRound: tanda.currentRound,
          totalRounds: tanda.totalRounds,
          startedAt: tanda.startedAt,
          currentRoundStartedAt: tanda.currentRoundStartedAt,
          cancelledAt: tanda.cancelledAt,
          completedAt: new Date().toISOString(),
        });
      }

      return this.tandaRepository.updateTanda({
        id: tanda.id,
        status: "active",
        currentRound: tanda.currentRound + 1,
        totalRounds: tanda.totalRounds,
        startedAt: tanda.startedAt,
        currentRoundStartedAt: new Date().toISOString(),
        cancelledAt: tanda.cancelledAt,
        completedAt: tanda.completedAt,
      });
    });
  }

  /**
   * Get contribution history for a participant.
   *
   * @param tandaId Tanda identifier.
   * @param participantId Participant identifier.
   * @returns Contribution history.
   */
  public getParticipantHistory(tandaId: number, participantId: number): ReadonlyArray<Contribution> {
    this.requireTanda(tandaId);
    this.requireParticipant(participantId, tandaId);
    return this.tandaRepository.listContributionsForParticipant(tandaId, participantId);
  }

  /**
   * Ensure a user exists.
   *
   * @param userId User identifier.
   * @returns No return value.
   */
  private ensureUserExists(userId: number): void {
    if (!this.userRepository.findById(userId)) {
      throw new NotFoundError(`User ${userId} was not found`);
    }
  }

  /**
   * Load a tanda or throw a not found error.
   *
   * @param tandaId Tanda identifier.
   * @returns Loaded tanda.
   */
  private requireTanda(tandaId: number): Tanda {
    const tanda = this.tandaRepository.findTandaById(tandaId);
    if (!tanda) {
      throw new NotFoundError(`Tanda ${tandaId} was not found`);
    }

    return tanda;
  }

  /**
   * Load a participant or throw a not found error.
   *
   * @param participantId Participant identifier.
   * @param tandaId Tanda identifier.
   * @returns Loaded participant.
   */
  private requireParticipant(participantId: number, tandaId: number): Participant {
    const participant = this.tandaRepository.findParticipantById(participantId);
    if (!participant || participant.tandaId !== tandaId) {
      throw new NotFoundError(`Participant ${participantId} was not found in tanda ${tandaId}`);
    }

    return participant;
  }

  /**
   * Ensure the caller is the tanda organizer.
   *
   * @param tanda Tanda to validate.
   * @param organizerId Caller identifier.
   * @returns No return value.
   */
  private assertOrganizer(tanda: Tanda, organizerId: number): void {
    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError("Only the organizer can perform this action");
    }
  }
}

/**
 * Assign randomized rotation positions to all participants.
 *
 * @param repository Tanda repository dependency.
 * @param participants Participants to shuffle.
 * @returns No return value.
 */
function assignRotationPositions(repository: TandaRepository, participants: ReadonlyArray<Participant>): void {
  const shuffledParticipants = shuffleParticipants(participants);
  shuffledParticipants.forEach((participant, index) => {
    repository.updateParticipantRotation(participant.id, index + 1);
  });
}

/**
 * Shuffle participants using Fisher-Yates.
 *
 * @param participants Participants to shuffle.
 * @returns Shuffled participant copy.
 */
function shuffleParticipants(participants: ReadonlyArray<Participant>): ReadonlyArray<Participant> {
  const shuffled = [...participants];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentParticipant = shuffled[index];
    const swapParticipant = shuffled[swapIndex];
    if (!currentParticipant || !swapParticipant) {
      throw new Error("Shuffle indexes must reference existing participants");
    }

    shuffled[index] = swapParticipant;
    shuffled[swapIndex] = currentParticipant;
  }
  return shuffled;
}

/**
 * Calculate the late payment penalty.
 *
 * @param amount Contribution amount.
 * @param latePenaltyPercent Penalty percentage.
 * @returns Penalty amount.
 */
function calculatePenaltyAmount(amount: number, latePenaltyPercent: number): number {
  return Math.ceil((amount * latePenaltyPercent) / 100);
}

/**
 * Check whether a contribution falls outside the configured window.
 *
 * @param currentRoundStartedAt Current round start timestamp.
 * @param recordedAt Contribution timestamp.
 * @param contributionWindowHours Allowed window in hours.
 * @returns True when contribution is late.
 */
function isAfterContributionWindow(
  currentRoundStartedAt: string,
  recordedAt: string,
  contributionWindowHours: number,
): boolean {
  const cutoff = new Date(currentRoundStartedAt).getTime() + (contributionWindowHours * 60 * 60 * 1000);
  return new Date(recordedAt).getTime() > cutoff;
}

/**
 * Build a round summary that includes pending contributions.
 *
 * @param participants Tanda participants.
 * @param storedContributions Stored contributions for the round.
 * @returns Complete round contribution list.
 */
function buildRoundContributions(
  participants: ReadonlyArray<Participant>,
  storedContributions: ReadonlyArray<Contribution>,
): ReadonlyArray<RoundContribution> {
  return participants.map(participant => {
    const storedContribution = storedContributions.find(
      contribution => contribution.participantId === participant.id,
    );
    return storedContribution
      ? {
          participantId: storedContribution.participantId,
          amount: storedContribution.amount,
          status: storedContribution.status,
          penaltyAmount: storedContribution.penaltyAmount,
        }
      : {
          participantId: participant.id,
          amount: 0,
          status: "pending",
          penaltyAmount: 0,
        };
  });
}

/**
 * Insert missed contributions for participants who did not pay.
 *
 * @param repository Tanda repository dependency.
 * @param tanda Current tanda state.
 * @param participants Tanda participants.
 * @returns No return value.
 */
function markMissedContributions(
  repository: TandaRepository,
  tanda: Tanda,
  participants: ReadonlyArray<Participant>,
): void {
  const existingContributions = repository.listContributionsForRound(tanda.id, tanda.currentRound);
  participants.forEach(participant => {
    const hasContribution = existingContributions.some(
      contribution => contribution.participantId === participant.id,
    );
    if (!hasContribution) {
      repository.createContribution({
        tandaId: tanda.id,
        participantId: participant.id,
        round: tanda.currentRound,
        amount: 0,
        status: "missed",
        penaltyAmount: 0,
        createdAt: new Date().toISOString(),
      });
    }
  });
}

/**
 * Update defaulter flags from contribution history.
 *
 * @param repository Tanda repository dependency.
 * @param tandaId Tanda identifier.
 * @param participants Tanda participants.
 * @returns No return value.
 */
function updateDefaulters(
  repository: TandaRepository,
  tandaId: number,
  participants: ReadonlyArray<Participant>,
): void {
  participants.forEach(participant => {
    const history = repository.listContributionsForParticipant(tandaId, participant.id);
    const lastTwo = history.slice(-2);
    const isDefaulter = lastTwo.length === 2 && lastTwo.every(contribution => contribution.status === "missed");
    repository.updateParticipantDefaulter(participant.id, isDefaulter);
  });
}
