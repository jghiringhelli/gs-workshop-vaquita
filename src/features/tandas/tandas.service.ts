import { ConflictError, NotFoundError, NotImplementedAppError } from "../../lib/errors";

import type { TandaRepository } from "./tandas.repository";
import type { UserRepository } from "../users";
import type {
  CreateTandaInput,
  JoinTandaInput,
  RecordContributionInput,
  Tanda,
  TandaParticipant,
} from "./tandas.types";

export interface TandasService {
  createTanda(input: CreateTandaInput): Tanda;
  getTandaById(id: number): Tanda;
  listTandasForUser(userId: number): ReadonlyArray<Tanda>;
  listParticipants(tandaId: number): ReadonlyArray<TandaParticipant>;
  joinTanda(input: JoinTandaInput): TandaParticipant;
  recordContribution(input: RecordContributionInput): void;
}

export interface TandasServiceConfig {
  readonly maxParticipants: number;
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
   * Records a contribution for the active round.
   * @param _input Contribution payload.
   * @returns Nothing.
   */
  public recordContribution(_input: RecordContributionInput): void {
    throw new NotImplementedAppError(
      "DefaultTandasService.recordContribution is not implemented yet.",
    );
  }
}