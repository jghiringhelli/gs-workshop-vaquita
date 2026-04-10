import type Database from "better-sqlite3";

import { NotImplementedAppError } from "../../lib/errors";
import type {
  CreateTandaInput,
  JoinTandaInput,
  RecordContributionInput,
  Tanda,
  TandaParticipant,
} from "./tandas.types";

export interface TandaRepository {
  create(input: CreateTandaInput): Tanda;
  findById(id: number): Tanda | null;
  listByUserId(userId: number): ReadonlyArray<Tanda>;
  listParticipants(tandaId: number): ReadonlyArray<TandaParticipant>;
  join(input: JoinTandaInput): TandaParticipant;
  recordContribution(input: RecordContributionInput): void;
}

export class SqliteTandaRepository implements TandaRepository {
  public constructor(private readonly database: Database.Database) {
    void this.database;
  }

  /**
   * Creates a tanda record in SQLite.
   * @param _input Tanda creation payload.
   * @returns Persisted tanda.
   */
  public create(_input: CreateTandaInput): Tanda {
    throw new NotImplementedAppError("SqliteTandaRepository.create is not implemented yet.");
  }

  /**
   * Finds a tanda by its identifier.
   * @param _id Tanda identifier.
   * @returns Matching tanda or null.
   */
  public findById(_id: number): Tanda | null {
    throw new NotImplementedAppError("SqliteTandaRepository.findById is not implemented yet.");
  }

  /**
   * Lists tandas visible to a user.
   * @param _userId User identifier.
   * @returns Tandas associated with the user.
   */
  public listByUserId(_userId: number): ReadonlyArray<Tanda> {
    throw new NotImplementedAppError(
      "SqliteTandaRepository.listByUserId is not implemented yet.",
    );
  }

  /**
   * Lists tanda participants.
   * @param _tandaId Tanda identifier.
   * @returns Participants for the tanda.
   */
  public listParticipants(_tandaId: number): ReadonlyArray<TandaParticipant> {
    throw new NotImplementedAppError(
      "SqliteTandaRepository.listParticipants is not implemented yet.",
    );
  }

  /**
   * Adds a participant to a tanda.
   * @param _input Join request payload.
   * @returns Persisted participant record.
   */
  public join(_input: JoinTandaInput): TandaParticipant {
    throw new NotImplementedAppError("SqliteTandaRepository.join is not implemented yet.");
  }

  /**
   * Records a contribution for a participant in the active round.
   * @param _input Contribution payload.
   * @returns Nothing.
   */
  public recordContribution(_input: RecordContributionInput): void {
    throw new NotImplementedAppError(
      "SqliteTandaRepository.recordContribution is not implemented yet.",
    );
  }
}