/** Possible states for a contribution record */
export type ContributionStatus = "pending" | "paid" | "late" | "missed";

/** A single contribution record for one participant in one round */
export interface Contribution {
  readonly id: string;
  readonly tandaId: string;
  readonly participantId: string;
  readonly round: number;
  /** Amount paid in minor units */
  readonly amount: number;
  readonly status: ContributionStatus;
  readonly createdAt: string;
}

/** Input to record a contribution */
export interface RecordContributionDto {
  readonly participantId: string;
  /** Amount being paid in minor units */
  readonly amount: number;
}

/** Response shape returned to consumers */
export interface ContributionResponseDto {
  readonly id: string;
  readonly tandaId: string;
  readonly participantId: string;
  readonly round: number;
  readonly amount: number;
  readonly status: ContributionStatus;
  readonly createdAt: string;
}

/** Summary of a round */
export interface RoundSummaryDto {
  readonly round: number;
  readonly contributions: ContributionResponseDto[];
  readonly totalPaid: number;
  readonly totalExpected: number;
}
