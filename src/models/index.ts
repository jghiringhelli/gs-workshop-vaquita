export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';
export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';
export type ParticipantRole = 'organizer' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
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
  rotationPosition: number;
}

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
}

export interface RoundSummary {
  round: number;
  recipientParticipantId: string;
  contributions: Contribution[];
  totalCollected: number;
  allPaid: boolean;
}
