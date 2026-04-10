/** Valid lifecycle statuses for a Contribution. */
export type ContributionStatus = 'paid' | 'missed' | 'late';

/**
 * Raw database row — internal to the repository layer only.
 */
export interface ContributionRow {
  id: string;
  tanda_id: string;
  participant_id: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  created_at: string;
}

/**
 * Domain entity — canonical in-memory representation of a Contribution.
 */
export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  createdAt: string;
}

/**
 * Input DTO for recording a contribution.
 * Used internally by services — not exposed directly at the API boundary.
 */
export interface CreateContributionDTO {
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
}

/**
 * Response DTO for a single contribution record.
 */
export interface ContributionResponseDTO {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  createdAt: string;
}

/**
 * Response DTO for GET /api/tandas/:id/rounds/:round.
 * Shows who paid, who is still pending, and the total collected for the round.
 */
export interface RoundSummaryDTO {
  tandaId: string;
  round: number;
  totalCollected: number;
  paid: ContributionResponseDTO[];
  pending: Array<{ participantId: string; userId: string }>;
}
