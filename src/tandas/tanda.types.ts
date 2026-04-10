/** Valid lifecycle states for a Tanda. */
export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';

/**
 * Raw database row — internal to the repository layer only.
 */
export interface TandaRow {
  id: string;
  name: string;
  organizer_id: string;
  contribution_amount: number;
  status: TandaStatus;
  current_round: number;
  total_rounds: number;
  created_at: string;
}

/**
 * Domain entity — canonical in-memory representation of a Tanda.
 * No HTTP concepts. No framework imports.
 */
export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  /** Set to participant count when the tanda transitions FORMING → ACTIVE. 0 while forming. */
  totalRounds: number;
  createdAt: string;
}

/**
 * Input DTO — validated data required to create a Tanda.
 */
export interface CreateTandaDTO {
  name: string;
  organizerId: string;
  contributionAmount: number;
}

/**
 * Response DTO — the shape returned to API consumers.
 * Explicit field list: only what clients should see.
 */
export interface TandaResponseDTO {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
  createdAt: string;
}
