/** Domain types — zero external imports. Pure TypeScript interfaces and enums. */

export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';
export type ParticipantRole = 'organizer' | 'member';
export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  /** Stored as integer cents (e.g. 100000 = $1000.00). */
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
}

export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  /** Assigned when tanda transitions FORMING → ACTIVE. Null until then. */
  rotationPosition: number | null;
}

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  /** Stored as integer cents. */
  amount: number;
  status: ContributionStatus;
}
