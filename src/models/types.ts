export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';

export type ParticipantRole = 'organizer' | 'member';

export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface Tanda {
  id: number;
  name: string;
  organizerId: number;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Participant {
  id: number;
  userId: number;
  tandaId: number;
  role: ParticipantRole;
  rotationPosition?: number;
  joinedAt: string;
}

export interface Contribution {
  id: number;
  tandaId: number;
  participantId: number;
  round: number;
  amount: number;
  status: ContributionStatus;
  paidAt?: string;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
}

export interface CreateTandaRequest {
  name: string;
  organizerId: number;
  contributionAmount: number;
}

export interface JoinTandaRequest {
  userId: number;
}

export interface RecordContributionRequest {
  participantId: number;
  amount: number;
}
