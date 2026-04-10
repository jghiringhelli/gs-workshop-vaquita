import { NotImplementedAppError } from "../../lib/errors";

import type { TandaRepository } from "./tandas.repository";
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

export class DefaultTandasService implements TandasService {
  public constructor(private readonly tandaRepository: TandaRepository) {
    void this.tandaRepository;
  }

  /**
   * Creates a new tanda aggregate.
   * @param _input Tanda creation payload.
   * @returns Persisted tanda projection.
   */
  public createTanda(_input: CreateTandaInput): Tanda {
    throw new NotImplementedAppError("DefaultTandasService.createTanda is not implemented yet.");
  }

  /**
   * Returns tanda details by identifier.
   * @param _id Tanda identifier.
   * @returns Tanda details.
   */
  public getTandaById(_id: number): Tanda {
    throw new NotImplementedAppError("DefaultTandasService.getTandaById is not implemented yet.");
  }

  /**
   * Lists tandas for a user.
   * @param _userId User identifier.
   * @returns Tandas associated with the user.
   */
  public listTandasForUser(_userId: number): ReadonlyArray<Tanda> {
    throw new NotImplementedAppError(
      "DefaultTandasService.listTandasForUser is not implemented yet.",
    );
  }

  /**
   * Lists participants for a tanda.
   * @param _tandaId Tanda identifier.
   * @returns Tanda participants.
   */
  public listParticipants(_tandaId: number): ReadonlyArray<TandaParticipant> {
    throw new NotImplementedAppError(
      "DefaultTandasService.listParticipants is not implemented yet.",
    );
  }

  /**
   * Joins a user to a tanda.
   * @param _input Join request payload.
   * @returns Persisted participant projection.
   */
  public joinTanda(_input: JoinTandaInput): TandaParticipant {
    throw new NotImplementedAppError("DefaultTandasService.joinTanda is not implemented yet.");
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