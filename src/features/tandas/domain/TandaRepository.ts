import type {
  Contribution,
  ContributionStatus,
  CreateTandaInput,
  Participant,
  ParticipantRole,
  Tanda,
} from "./TandaModels";

export interface CreateTandaRecord extends CreateTandaInput {
  readonly now: string;
  readonly totalRounds: number;
}

export interface CreateParticipantRecord {
  readonly tandaId: number;
  readonly userId: number;
  readonly role: ParticipantRole;
  readonly joinedAt: string;
}

export interface RotationAssignment {
  readonly participantId: number;
  readonly rotationPosition: number;
}

export interface CreateContributionRecord {
  readonly tandaId: number;
  readonly participantId: number;
  readonly round: number;
  readonly amount: number;
  readonly status: Exclude<ContributionStatus, "pending">;
  readonly penaltyAmount: number;
  readonly recordedAt: string;
}

export interface TandaRepository {
  /**
   * Create a tanda record in storage.
   *
   * @param input The tanda data to persist.
   * @returns The created tanda.
   */
  createTanda(input: CreateTandaRecord): Tanda;

  /**
   * List every tanda a user participates in.
   *
   * @param userId The user identifier.
   * @returns The tandas visible to that user.
   */
  listTandasForUser(userId: number): readonly Tanda[];

  /**
   * Return a single tanda by identifier.
   *
   * @param tandaId The tanda identifier.
   * @returns The tanda when found, otherwise null.
   */
  getTandaById(tandaId: number): Tanda | null;

  /**
   * Persist a participant in a tanda.
   *
   * @param input The participant data to store.
   * @returns The created participant.
   */
  addParticipant(input: CreateParticipantRecord): Participant;

  /**
   * Return all participants for a tanda.
   *
   * @param tandaId The tanda identifier.
   * @returns The tanda participants.
   */
  listParticipants(tandaId: number): readonly Participant[];

  /**
   * Return a participant by its identifier within a tanda.
   *
   * @param tandaId The tanda identifier.
   * @param participantId The participant identifier.
   * @returns The participant when found, otherwise null.
   */
  getParticipantById(tandaId: number, participantId: number): Participant | null;

  /**
   * Return a participant by user identifier within a tanda.
   *
   * @param tandaId The tanda identifier.
   * @param userId The user identifier.
   * @returns The participant when found, otherwise null.
   */
  getParticipantByUserId(tandaId: number, userId: number): Participant | null;

  /**
   * Persist a tanda state update.
   *
   * @param tanda The full tanda state to save.
   * @returns The saved tanda state.
   */
  saveTandaState(tanda: Tanda): Tanda;

  /**
   * Persist the rotation positions assigned to participants.
   *
   * @param tandaId The tanda identifier.
   * @param assignments The rotation assignments to apply.
   * @returns Nothing.
   */
  assignRotationPositions(tandaId: number, assignments: readonly RotationAssignment[]): void;

  /**
   * Return all contributions for a round.
   *
   * @param tandaId The tanda identifier.
   * @param round The round number.
   * @returns The contributions for that round.
   */
  listContributionsForRound(tandaId: number, round: number): readonly Contribution[];

  /**
   * Return a contribution by participant and round.
   *
   * @param tandaId The tanda identifier.
   * @param participantId The participant identifier.
   * @param round The round number.
   * @returns The contribution when found, otherwise null.
   */
  getContribution(tandaId: number, participantId: number, round: number): Contribution | null;

  /**
   * Persist a contribution record.
   *
   * @param input The contribution data to store.
   * @returns The created contribution.
   */
  createContribution(input: CreateContributionRecord): Contribution;

  /**
   * Return contribution history for a participant.
   *
   * @param participantId The participant identifier.
   * @returns The participant contribution history.
   */
  listContributionHistory(participantId: number): readonly Contribution[];

  /**
   * Return the latest persisted contribution statuses for a participant.
   *
   * @param participantId The participant identifier.
   * @param limit The maximum number of statuses to return.
   * @returns The latest statuses, newest first.
   */
  listRecentContributionStatuses(
    participantId: number,
    limit: number,
  ): readonly Exclude<ContributionStatus, "pending">[];

  /**
   * Update whether a participant is flagged as a defaulter.
   *
   * @param participantId The participant identifier.
   * @param isDefaulter Whether the participant should be flagged.
   * @returns Nothing.
   */
  setParticipantDefaulter(participantId: number, isDefaulter: boolean): void;

  /**
   * Execute repository operations inside a single SQLite transaction.
   *
   * @param operation The operation to run transactionally.
   * @returns The operation result.
   */
  runInTransaction<T>(operation: () => T): T;
}
