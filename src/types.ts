/** Shared domain types — no external imports. */

export interface User {
  id: string;
  email: string;
  name: string;
}

export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';

export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
}

export type ParticipantRole = 'organizer' | 'member';

export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  rotationPosition: number | null;
  isDefaulter: number; // 0 | 1 (SQLite boolean)
}

export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
}
