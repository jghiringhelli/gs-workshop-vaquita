import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  NotImplementedAppError,
} from "../../lib/errors";

import type { TandaRepository } from "./tandas.repository";
import type { UserRepository } from "../users";
import type {
  AdvanceTandaInput,
  CreateTandaInput,
  JoinTandaInput,
  RecordContributionInput,
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
  recordContribution(input: RecordContributionInput): void;
}

export interface TandasServiceConfig {
  readonly maxParticipants: number;
  readonly minParticipantsToStart: number;
}

export class DefaultTandasService implements TandasService {
  public constructor(
    private readonly tandaRepository: TandaRepository,
    private readonly userRepository: UserRepository,
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

    return this.tandaRepository.create({
      name: input.name.trim(),
      organizerId: input.organizerId,
      contributionAmount: input.contributionAmount,
    });
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

    return this.tandaRepository.join(input);
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
    return this.tandaRepository.start(input, orderedParticipantIds);
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

    return this.tandaRepository.advance(input);
  }

  /**
   * Records a contribution for the active round.
   * @param _input Contribution payload.
   * @returns Nothing.
   */
  public recordContribution(_input: RecordContributionInput): void {
    throw new NotImplementedAppError(
      "DefaultTandasService.recordContribution is not implemented yet.",
    );
  }

  private assertOrganizerActionAllowed(tanda: Tanda, organizerId: number): void {
    if (tanda.organizerId !== organizerId) {
      throw new ForbiddenError("Only the organizer can perform this action.", {
        details: { tandaId: tanda.id, organizerId },
      });
    }
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