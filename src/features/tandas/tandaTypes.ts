/**
 * Valid lifecycle states for a tanda.
 */
export type TandaStatus = "forming" | "active" | "completed" | "cancelled";

/**
 * Valid participant roles in a tanda.
 */
export type ParticipantRole = "organizer" | "member";

/**
 * Valid contribution statuses.
 */
export type ContributionStatus = "pending" | "paid" | "late" | "missed";

/**
 * Public tanda representation with internal state fields used by services.
 */
export interface Tanda {
  readonly id: number;
  readonly name: string;
  readonly organizerId: number;
  readonly contributionAmount: number;
  readonly status: TandaStatus;
  readonly currentRound: number;
  readonly totalRounds: number;
  readonly startedAt: string | null;
  readonly currentRoundStartedAt: string;
  readonly cancelledAt: string | null;
  readonly completedAt: string | null;
}

/**
 * Public participant representation.
 */
export interface Participant {
  readonly id: number;
  readonly userId: number;
  readonly tandaId: number;
  readonly role: ParticipantRole;
  readonly rotationPosition: number | null;
  readonly isDefaulter: boolean;
}

/**
 * Stored contribution representation.
 */
export interface Contribution {
  readonly id: number;
  readonly tandaId: number;
  readonly participantId: number;
  readonly round: number;
  readonly amount: number;
  readonly status: Exclude<ContributionStatus, "pending">;
  readonly penaltyAmount: number;
  readonly createdAt: string;
}

/**
 * Contribution summary entry returned by the round summary endpoint.
 */
export interface RoundContribution {
  readonly participantId: number;
  readonly amount: number;
  readonly status: ContributionStatus;
  readonly penaltyAmount: number;
}

/**
 * Summary for a tanda round.
 */
export interface RoundSummary {
  readonly tandaId: number;
  readonly round: number;
  readonly recipientParticipantId: number | null;
  readonly contributions: ReadonlyArray<RoundContribution>;
  readonly expectedAmount: number;
  readonly collectedAmount: number;
  readonly penaltyAmount: number;
}

/**
 * Data required to create a tanda.
 */
export interface CreateTandaInput {
  readonly name: string;
  readonly organizerId: number;
  readonly contributionAmount: number;
}
