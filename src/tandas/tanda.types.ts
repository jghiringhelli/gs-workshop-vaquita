/** Possible lifecycle states for a tanda */
export type TandaStatus = "forming" | "active" | "completed" | "cancelled";

/** A rotating savings group */
export interface Tanda {
  readonly id: string;
  readonly name: string;
  readonly organizerId: string;
  /** Contribution amount in minor units (e.g. cents) */
  readonly contributionAmount: number;
  readonly status: TandaStatus;
  readonly currentRound: number;
  readonly totalRounds: number;
  readonly createdAt: string;
}

/** Input to create a new tanda */
export interface CreateTandaDto {
  readonly name: string;
  readonly organizerId: string;
  /** Contribution amount in minor units */
  readonly contributionAmount: number;
}

/** Response shape returned to consumers */
export interface TandaResponseDto {
  readonly id: string;
  readonly name: string;
  readonly organizerId: string;
  readonly contributionAmount: number;
  readonly status: TandaStatus;
  readonly currentRound: number;
  readonly totalRounds: number;
  readonly createdAt: string;
}
