/**
 * Tanda-module domain entities.
 * Zero external imports — pure domain.
 */

export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';
export type ParticipantRole = 'organizer' | 'member';
export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

/** Rotating savings group */
export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: TandaStatus;
  /** 0 while forming; 1-based once active */
  currentRound: number;
  /** Total rounds = number of participants; 0 while forming */
  totalRounds: number;
}

/** A user's membership in a tanda */
export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  /** 1-based position in rotation; null until tanda starts */
  rotationPosition: number | null;
}

/** A contribution recorded for one round */
export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
}

