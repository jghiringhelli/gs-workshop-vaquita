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

export interface Participant {
  id: number;
  userId: number;
  tandaId: number;
  role: ParticipantRole;
  rotationPosition: number | null;
  isDefaulter: boolean;
}

export interface Contribution {
  id: number;
  tandaId: number;
  participantId: number;
  round: number;
  amount: number;
  status: ContributionStatus;
  penaltyAmount: number;
}
