/**
 * Domain types for the Tanda API
 */

export type TandaStatus = "forming" | "active" | "completed" | "cancelled";
export type ParticipantRole = "organizer" | "member";
export type ContributionStatus = "pending" | "paid" | "late" | "missed";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Tanda {
  id: string;
  name: string;
  organizerId: string;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  userId: string;
  tandaId: string;
  role: ParticipantRole;
  rotationPosition: number | null;
  isDefaulter: boolean;
  createdAt: string;
}

export interface Contribution {
  id: string;
  tandaId: string;
  participantId: string;
  round: number;
  amount: number;
  status: ContributionStatus;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Round {
  tandaId: string;
  round: number;
  recipientParticipantId: string;
  startedAt: string;
  completedAt: string | null;
  totalCollected: number;
  totalPending: number;
  totalPaid: number;
  totalLate: number;
  totalMissed: number;
}

// Request/Response DTOs
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

export interface AuthPayload {
  userId: string;
  iat?: number;
  exp?: number;
}
