export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
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
  createdAt: string;
}

export type ParticipantRole = 'organizer' | 'member';

export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  rotationPosition: number | null;
  isDefaulter: boolean;
  consecutiveMissed: number;
  createdAt: string;
}

export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  createdAt: string;
}
