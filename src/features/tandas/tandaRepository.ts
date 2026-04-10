import type { Contribution, Participant, Tanda, TandaStatus } from "./tandaTypes";

/**
 * Data required to persist a new tanda row.
 */
export interface CreateTandaRecordInput {
  readonly name: string;
  readonly organizerId: number;
  readonly contributionAmount: number;
  readonly status: TandaStatus;
  readonly currentRound: number;
  readonly totalRounds: number;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly currentRoundStartedAt: string;
  readonly cancelledAt: string | null;
  readonly completedAt: string | null;
}

/**
 * Data required to update an existing tanda row.
 */
export interface UpdateTandaRecordInput {
  readonly id: number;
  readonly status: TandaStatus;
  readonly currentRound: number;
  readonly totalRounds: number;
  readonly startedAt: string | null;
  readonly currentRoundStartedAt: string;
  readonly cancelledAt: string | null;
  readonly completedAt: string | null;
}

/**
 * Data required to persist a new participant row.
 */
export interface CreateParticipantInput {
  readonly userId: number;
  readonly tandaId: number;
  readonly role: "organizer" | "member";
  readonly rotationPosition: number | null;
  readonly isDefaulter: boolean;
  readonly joinedAt: string;
}

/**
 * Data required to persist a contribution row.
 */
export interface CreateContributionInput {
  readonly tandaId: number;
  readonly participantId: number;
  readonly round: number;
  readonly amount: number;
  readonly status: "paid" | "late" | "missed";
  readonly penaltyAmount: number;
  readonly createdAt: string;
}

/**
 * Persistence contract for tanda workflows.
 */
export interface TandaRepository {
  /**
   * Run a repository operation inside a transaction.
   *
   * @param operation Operation to execute.
   * @returns Operation result.
   */
  runInTransaction<T>(operation: () => T): T;

  /**
   * Persist a new tanda.
   *
   * @param input New tanda data.
   * @returns Created tanda.
   */
  createTanda(input: CreateTandaRecordInput): Tanda;

  /**
   * Persist tanda state changes.
   *
   * @param input Updated tanda state.
   * @returns Updated tanda.
   */
  updateTanda(input: UpdateTandaRecordInput): Tanda;

  /**
   * Find a tanda by identifier.
   *
   * @param tandaId Tanda identifier.
   * @returns Matching tanda or null.
   */
  findTandaById(tandaId: number): Tanda | null;

  /**
   * List tandas for a user.
   *
   * @param userId User identifier.
   * @returns Matching tandas.
   */
  listTandasForUser(userId: number): ReadonlyArray<Tanda>;

  /**
   * Persist a participant.
   *
   * @param input Participant data.
   * @returns Created participant.
   */
  createParticipant(input: CreateParticipantInput): Participant;

  /**
   * List participants for a tanda.
   *
   * @param tandaId Tanda identifier.
   * @returns Ordered participant list.
   */
  listParticipants(tandaId: number): ReadonlyArray<Participant>;

  /**
   * Find a participant by identifier.
   *
   * @param participantId Participant identifier.
   * @returns Matching participant or null.
   */
  findParticipantById(participantId: number): Participant | null;

  /**
   * Find a participant by user and tanda.
   *
   * @param tandaId Tanda identifier.
   * @param userId User identifier.
   * @returns Matching participant or null.
   */
  findParticipantByUserId(tandaId: number, userId: number): Participant | null;

  /**
   * Update a participant's rotation slot.
   *
   * @param participantId Participant identifier.
   * @param rotationPosition Assigned rotation position.
   * @returns Updated participant.
   */
  updateParticipantRotation(participantId: number, rotationPosition: number): Participant;

  /**
   * Update a participant's defaulter flag.
   *
   * @param participantId Participant identifier.
   * @param isDefaulter New defaulter value.
   * @returns Updated participant.
   */
  updateParticipantDefaulter(participantId: number, isDefaulter: boolean): Participant;

  /**
   * Persist a contribution.
   *
   * @param input Contribution data.
   * @returns Created contribution.
   */
  createContribution(input: CreateContributionInput): Contribution;

  /**
   * Find a contribution by participant and round.
   *
   * @param participantId Participant identifier.
   * @param round Round number.
   * @returns Matching contribution or null.
   */
  findContributionByParticipantAndRound(participantId: number, round: number): Contribution | null;

  /**
   * List stored contributions for a round.
   *
   * @param tandaId Tanda identifier.
   * @param round Round number.
   * @returns Matching contributions.
   */
  listContributionsForRound(tandaId: number, round: number): ReadonlyArray<Contribution>;

  /**
   * List stored contributions for a participant.
   *
   * @param tandaId Tanda identifier.
   * @param participantId Participant identifier.
   * @returns Matching contributions.
   */
  listContributionsForParticipant(tandaId: number, participantId: number): ReadonlyArray<Contribution>;
}
