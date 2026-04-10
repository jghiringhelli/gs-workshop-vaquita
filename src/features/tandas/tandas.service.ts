import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../lib/errors";
import type { AuditLogger } from "../../lib/audit-log";

import type { TandaRepository } from "./tandas.repository";
import type { UserRepository } from "../users";
import type {
  AdvanceTandaInput,
  CancelTandaInput,
  ContributionRecord,
  CreateTandaInput,
  JoinTandaInput,
  RecordContributionInput,
  RoundSummary,
  StartTandaInput,
  Tanda,
  TandaParticipant,
} from "./tandas.types";

export interface TandasService {
  createTanda(input: CreateTandaInput): Tanda;
  getTandaById(id: number): Tanda;
  listTandasForUser(userId: number): ReadonlyArray<Tanda>;
  listParticipants(tandaId: number): ReadonlyArray<TandaParticipant>;
  joinTanda(input: JoinTandaInput): TandaParticipant;
  startTanda(input: StartTandaInput): Tanda;
  advanceTanda(input: AdvanceTandaInput): Tanda;
  cancelTanda(input: CancelTandaInput): Tanda;
  recordContribution(input: RecordContributionInput): ContributionRecord;
  getParticipantHistory(tandaId: number, participantId: number): ReadonlyArray<ContributionRecord>;
  getRoundSummary(tandaId: number, round: number): RoundSummary;
}

export interface TandasServiceConfig {
  readonly maxParticipants: number;
  readonly minParticipantsToStart: number;
  readonly latePenaltyPercent: number;
}

export class DefaultTandasService implements TandasService {
  public constructor(
    private readonly tandaRepository: TandaRepository,
    private readonly userRepository: UserRepository,
    private readonly auditLogger: AuditLogger,
    private readonly config: TandasServiceConfig,
  ) {}

  /**
   * Creates a new tanda aggregate.
   * @param input Tanda creation payload.
   * @returns Persisted tanda projection.
   */
  public createTanda(input: CreateTandaInput): Tanda {
    const organizer = this.userRepository.findById(input.organizerId);
    if (!organizer) {
      throw new NotFoundError("Organizer not found.", {
        details: { organizerId: input.organizerId },
      });
    }

    const tanda = this.tandaRepository.create({
      name: input.name.trim(),
      organizerId: input.organizerId,
      contributionAmount: input.contributionAmount,
    });

    this.auditLogger.record({
      actorUserId: input.organizerId,
      action: "tanda.created",
      resourceType: "tanda",
      resourceId: tanda.id,
      details: { contributionAmount: tanda.contributionAmount },
    });

    return tanda;
  }

  /**
   * Returns tanda details by identifier.
   * @param id Tanda identifier.
   * @returns Tanda details.
   */
  public getTandaById(id: number): Tanda {
    const tanda = this.tandaRepository.findById(id);
    if (!tanda) {
      throw new NotFoundError("Tanda not found.", { details: { id } });
    }

    return tanda;
  }

  /**
   * Lists tandas for a user.
   * @param userId User identifier.
   * @returns Tandas associated with the user.
   */
  public listTandasForUser(userId: number): ReadonlyArray<Tanda> {
    const user = this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found.", { details: { userId } });
    }

    return this.tandaRepository.listByUserId(userId);
  }

  /**
   * Lists participants for a tanda.
   * @param tandaId Tanda identifier.
   * @returns Tanda participants.
   */
  public listParticipants(tandaId: number): ReadonlyArray<TandaParticipant> {
    this.getTandaById(tandaId);
    return this.tandaRepository.listParticipants(tandaId);
  }

  /**
   * Joins a user to a tanda.
   * @param input Join request payload.
   * @returns Persisted participant projection.
   */
  public joinTanda(input: JoinTandaInput): TandaParticipant {
    const tanda = this.getTandaById(input.tandaId);
    const user = this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundError("User not found.", { details: { userId: input.userId } });
    }

    if (tanda.status !== "forming") {
      throw new ConflictError("Only tandas in forming status can be joined.", {
        details: { tandaId: input.tandaId, status: tanda.status },
      });
    }

    const participants = this.tandaRepository.listParticipants(input.tandaId);
    if (participants.some((participant) => participant.userId === input.userId)) {
      throw new ConflictError("User is already a participant in this tanda.", {
        details: { tandaId: input.tandaId, userId: input.userId },
      });
    }

    if (participants.length >= this.config.maxParticipants) {
      throw new ConflictError("Tanda has reached the maximum number of participants.", {
        details: {
          tandaId: input.tandaId,
          maxParticipants: this.config.maxParticipants,
        },
      });
    }

    const participant = this.tandaRepository.join(input);
    this.auditLogger.record({
      actorUserId: input.userId,
      action: "tanda.joined",
      resourceType: "tanda",
      resourceId: input.tandaId,
      details: { participantId: participant.id },
    });

    return participant;
  }

  /**
   * Starts a tanda and locks randomized participant rotation.
   * @param input Start request payload.
   * @returns Updated tanda projection.
   */
  public startTanda(input: StartTandaInput): Tanda {
    const tanda = this.getTandaById(input.tandaId);
    this.assertOrganizerActionAllowed(tanda, input.organizerId);

    if (tanda.status !== "forming") {
      throw new ConflictError("Only tandas in forming status can be started.", {
        details: { tandaId: input.tandaId, status: tanda.status },
      });
    }

    const participants = this.tandaRepository.listParticipants(input.tandaId);
    if (participants.length < this.config.minParticipantsToStart) {
      throw new BadRequestError("At least 3 participants are required to start a tanda.", {
        details: {
          tandaId: input.tandaId,
          participantCount: participants.length,
          minParticipants: this.config.minParticipantsToStart,
        },
      });
    }

    if (participants.length > this.config.maxParticipants) {
      throw new ConflictError("Tanda exceeds the configured participant limit.", {
        details: {
          tandaId: input.tandaId,
          participantCount: participants.length,
          maxParticipants: this.config.maxParticipants,
        },
      });
    }

    const orderedParticipantIds = shuffleParticipantIds(participants.map((participant) => participant.id));
    const startedTanda = this.tandaRepository.start(input, orderedParticipantIds);
    this.auditLogger.record({
      actorUserId: input.organizerId,
      action: "tanda.started",
      resourceType: "tanda",
      resourceId: input.tandaId,
      details: { totalRounds: startedTanda.totalRounds },
    });

    return startedTanda;
  }

  /**
   * Advances the active tanda to the next round or completes it.
   * @param input Advance request payload.
   * @returns Updated tanda projection.
   */
  public advanceTanda(input: AdvanceTandaInput): Tanda {
    const tanda = this.getTandaById(input.tandaId);
    this.assertOrganizerActionAllowed(tanda, input.organizerId);

    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new ConflictError("Completed or cancelled tandas cannot be advanced.", {
        details: { tandaId: input.tandaId, status: tanda.status },
      });
    }

    if (tanda.status !== "active") {
      throw new ConflictError("Only active tandas can be advanced.", {
        details: { tandaId: input.tandaId, status: tanda.status },
      });
    }

    const advancedTanda = this.tandaRepository.advance(input);
    this.auditLogger.record({
      actorUserId: input.organizerId,
      action: "tanda.advanced",
      resourceType: "tanda",
      resourceId: input.tandaId,
      details: {
        currentRound: advancedTanda.currentRound,
        status: advancedTanda.status,
      },
    });

    return advancedTanda;
  }

  /**
   * Cancels a tanda if the organizer requests it from a valid state.
   * @param input Cancel request payload.
   * @returns Updated tanda projection.
   */
  public cancelTanda(input: CancelTandaInput): Tanda {
    const tanda = this.getTandaById(input.tandaId);
    this.assertOrganizerActionAllowed(tanda, input.organizerId);

    if (tanda.status === "completed" || tanda.status === "cancelled") {
      throw new ConflictError("Completed or cancelled tandas cannot be cancelled again.", {
        details: { tandaId: input.tandaId, status: tanda.status },
      });
    }

    const cancelledTanda = this.tandaRepository.cancel(input);
    this.auditLogger.record({
      actorUserId: input.organizerId,
      action: "tanda.cancelled",
      resourceType: "tanda",
      resourceId: input.tandaId,
    });

    return cancelledTanda;
  }

  /**
   * Records a contribution for the active round.
   * @param input Contribution payload without derived round metadata.
   * @returns Persisted contribution record.
   */
  public recordContribution(
    input: RecordContributionInput,
  ): ContributionRecord {
    const tanda = this.getTandaById(input.tandaId);
    if (tanda.status !== "active") {
      throw new ConflictError("Contributions can only be recorded for active tandas.", {
        details: { tandaId: input.tandaId, status: tanda.status },
      });
    }

    const participant = this.tandaRepository.findParticipantByUserId(input.tandaId, input.userId);
    if (!participant) {
      throw new NotFoundError("Authenticated user is not a participant in this tanda.", {
        details: { tandaId: input.tandaId, userId: input.userId },
      });
    }

    if (input.amount !== tanda.contributionAmount) {
      throw new BadRequestError("Contribution amount must match the tanda contribution amount.", {
        details: {
          tandaId: input.tandaId,
          expectedAmount: tanda.contributionAmount,
          amount: input.amount,
        },
      });
    }

    const requestedRound = input.round ?? tanda.currentRound;
    if (requestedRound < 1 || requestedRound > tanda.currentRound) {
      throw new BadRequestError("Contribution round is outside the active tanda progress.", {
        details: { tandaId: input.tandaId, round: requestedRound, currentRound: tanda.currentRound },
      });
    }

    const existingContribution = this.tandaRepository.findContributionByRound(
      input.tandaId,
      participant.id,
      requestedRound,
    );

    if (!existingContribution) {
      if (requestedRound !== tanda.currentRound) {
        throw new ConflictError("Only missed contributions from previous rounds can be settled late.", {
          details: { tandaId: input.tandaId, participantId: participant.id, round: requestedRound },
        });
      }

      const contribution = this.tandaRepository.createContribution({
        tandaId: input.tandaId,
        participantId: participant.id,
        amount: input.amount,
        round: requestedRound,
        status: "paid",
        penaltyAmount: 0,
      });

      this.auditLogger.record({
        actorUserId: input.userId,
        action: "contribution.recorded",
        resourceType: "tanda",
        resourceId: input.tandaId,
        details: { participantId: participant.id, round: requestedRound, status: contribution.status },
      });

      return contribution;
    }

    if (existingContribution.status !== "missed") {
      throw new ConflictError("Participant has already settled this round contribution.", {
        details: { tandaId: input.tandaId, participantId: participant.id, round: requestedRound },
      });
    }

    const penaltyAmount = Math.ceil(
      tanda.contributionAmount * (this.config.latePenaltyPercent / 100),
    );

    const contribution = this.tandaRepository.settleLateContribution(
      existingContribution.id,
      tanda.contributionAmount,
      penaltyAmount,
    );

    this.auditLogger.record({
      actorUserId: input.userId,
      action: "contribution.settled_late",
      resourceType: "tanda",
      resourceId: input.tandaId,
      details: { participantId: participant.id, round: requestedRound, penaltyAmount },
    });

    return contribution;
  }

  /**
   * Returns the contribution history for a participant in a tanda.
   * @param tandaId Tanda identifier.
   * @param participantId Participant identifier.
   * @returns Ordered contribution records.
   */
  public getParticipantHistory(
    tandaId: number,
    participantId: number,
  ): ReadonlyArray<ContributionRecord> {
    this.getTandaById(tandaId);
    this.getParticipantOrThrow(tandaId, participantId);
    return this.tandaRepository.listContributionHistory(tandaId, participantId);
  }

  /**
   * Returns an aggregated summary for a tanda round.
   * @param tandaId Tanda identifier.
   * @param round Round number.
   * @returns Round summary projection.
   */
  public getRoundSummary(tandaId: number, round: number): RoundSummary {
    const tanda = this.getTandaById(tandaId);

    if (tanda.totalRounds === 0) {
      throw new BadRequestError("Round summaries are only available after the tanda starts.", {
        details: { tandaId, round },
      });
    }

    if (round < 1 || round > tanda.totalRounds) {
      throw new BadRequestError("Requested round is outside the configured tanda lifecycle.", {
        details: { tandaId, round, totalRounds: tanda.totalRounds },
      });
    }

    return this.tandaRepository.getRoundSummary(tandaId, round);
  }

  private assertOrganizerActionAllowed(tanda: Tanda, organizerId: number): void {
    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError("Only the organizer can perform this action.", {
        details: { tandaId: tanda.id, organizerId },
      });
    }
  }

  private getParticipantOrThrow(tandaId: number, participantId: number): TandaParticipant {
    const participant = this.tandaRepository
      .listParticipants(tandaId)
      .find((candidate) => candidate.id === participantId);

    if (!participant) {
      throw new NotFoundError("Participant not found in this tanda.", {
        details: { tandaId, participantId },
      });
    }

    return participant;
  }
}

function shuffleParticipantIds(participantIds: ReadonlyArray<number>): ReadonlyArray<number> {
  const shuffledParticipantIds = [...participantIds];

  for (let index = shuffledParticipantIds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentValue = shuffledParticipantIds[index];
    const swapValue = shuffledParticipantIds[swapIndex];

    if (currentValue === undefined || swapValue === undefined) {
      throw new Error("Participant shuffle failed due to an invalid index.");
    }

    shuffledParticipantIds[index] = swapValue;
    shuffledParticipantIds[swapIndex] = currentValue;
  }

  return shuffledParticipantIds;
}