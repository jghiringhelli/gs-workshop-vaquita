export type TandaStatus = "forming" | "active" | "completed" | "cancelled";
export type ParticipantRole = "organizer" | "member";
export type ContributionStatus = "pending" | "paid" | "late" | "missed";

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Tanda {
  id: number;
  name: string;
  organizerId: number;
  contributionAmount: number;
  status: TandaStatus;
  currentRound: number;
  totalRounds: number;
}

export interface TandaSummary extends Tanda {
  participantsCount: number;
}

export interface Participant {
  id: number;
  userId: number;
  tandaId: number;
  role: ParticipantRole;
  rotationPosition: number | null;
  name: string;
  email: string;
}

export interface ParticipantView extends Participant {
  isDefaulter: boolean;
}

export interface Contribution {
  id: number;
  tandaId: number;
  participantId: number;
  round: number;
  amount: number;
  penaltyAmount: number;
  status: ContributionStatus;
  paidAt: string | null;
}

export interface ContributionView extends Contribution {
  participantName: string;
  participantEmail: string;
}
