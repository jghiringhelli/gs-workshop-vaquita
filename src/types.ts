/**
 * Shared types and DTOs for the API
 */

export type UserRole = 'organizer' | 'member';
export type TandaStatus = 'forming' | 'active' | 'completed' | 'cancelled';
export type ContributionStatus = 'pending' | 'paid' | 'late' | 'missed';

// Domain Models
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: UserRole;
  rotationPosition: number | null;
  hasReceivedPayout: boolean;
  missedConsecutive: number;
  createdAt: Date;
}

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  paidAt: Date | null;
  createdAt: Date;
}

export interface Round {
  tandaId: string;
  round: number;
  recipientUserId: string | null;
  totalCollected: number;
  status: 'pending' | 'completed';
}

// Request DTOs
export interface CreateUserRequest {
  email: string;
  name: string;
}

export interface CreateTandaRequest {
  name: string;
  organizerId: string;
  contributionAmount: number;
}

export interface JoinTandaRequest {
  userId: string;
}

export interface RecordContributionRequest {
  participantId: string;
  amount: number;
}

// Response DTOs
export interface CreateUserResponse {
  data: User;
}

export interface ListUsersResponse {
  data: User[];
  meta: {
    count: number;
  };
}

export interface CreateTandaResponse {
  data: Tanda;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
